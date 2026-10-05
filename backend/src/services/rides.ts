import { HttpError } from "../errors";
import { POOL_DISCOUNT_PERCENT, soloFare } from "../fare";
import * as repo from "../repositories/rides";
import * as zones from "../repositories/zones";
import { withTx } from "../tx";

interface RideInput {
  pickupZoneId: number;
  destinationZoneId: number;
  seats: number;
}

function publicRide(r: repo.RideRow) {
  return {
    id: r.id,
    status: r.status,
    poolId: r.pool_id,
    pickupZoneId: r.pickup_zone_id,
    destinationZoneId: r.destination_zone_id,
    seats: r.seats,
    estimatedFarePaisa: r.estimated_fare_paisa,
    discountPaisa: r.discount_paisa,
    passengerFarePaisa: r.estimated_fare_paisa - r.discount_paisa,
    finalFarePaisa: r.final_fare_paisa,
  };
}

async function quote(input: RideInput) {
  const { pickupZoneId, destinationZoneId, seats } = input;
  const found = await zones.countExisting([pickupZoneId, destinationZoneId]);
  if (found !== 2) {
    throw new HttpError(404, "Zone not found");
  }
  const distanceKm = await zones.findDistanceKm(pickupZoneId, destinationZoneId);
  if (distanceKm === null) {
    throw new HttpError(422, "No distance data for this zone pair");
  }
  const { perSeatSubtotalPaisa, subtotalPaisa } = soloFare(distanceKm, seats);
  return {
    pickupZoneId,
    destinationZoneId,
    seats,
    distanceKm,
    perSeatSubtotalPaisa,
    estimatedFarePaisa: subtotalPaisa,
  };
}

export async function estimate(input: RideInput) {
  return quote(input);
}

export async function create(passengerId: string, input: RideInput) {
  const q = await quote(input);
  try {
    return await withTx(async (c) => {
      const ride = await repo.insertRide(
        c,
        passengerId,
        q.pickupZoneId,
        q.destinationZoneId,
        q.seats,
        q.estimatedFarePaisa
      );
      await repo.insertEvent(c, ride.id, null, "REQUESTED", passengerId);
      return publicRide(ride);
    });
  } catch (err) {
    // one_active_ride_per_passenger decides, even under races
    if ((err as { code?: string }).code === "23505") {
      throw new HttpError(409, "You already have an active ride");
    }
    throw err;
  }
}

export async function listMine(passengerId: string) {
  return (await repo.listByPassenger(passengerId)).map(publicRide);
}

export async function listAvailable() {
  return (await repo.listRequested()).map(publicRide);
}

export async function accept(driverId: string, rideId: string) {
  return withTx(async (c) => {
    // Lock order: vehicle, then ride. Concurrent accepts on one vehicle queue up here.
    const vehicle = await repo.lockVehicleByDriver(c, driverId);
    if (!vehicle) {
      throw new HttpError(404, "No vehicle registered");
    }
    if (!vehicle.is_online) {
      throw new HttpError(409, "Driver is offline");
    }
    const ride = await repo.lockRide(c, rideId);
    if (!ride) {
      throw new HttpError(404, "Ride not found");
    }
    if (ride.status !== "REQUESTED") {
      throw new HttpError(409, "Ride is no longer available");
    }

    const active = await repo.lockActivePool(c, vehicle.id);
    let poolId: string;
    if (!active) {
      if (ride.seats > vehicle.capacity) {
        throw new HttpError(409, "Not enough seats in vehicle");
      }
      const created = await repo.createPool(c, vehicle.id, ride.pickup_zone_id, vehicle.capacity, ride.seats);
      poolId = created.id;
    } else {
      if (active.status !== "OPEN") {
        throw new HttpError(409, "Trip already in progress");
      }
      if (active.pickup_zone_id !== ride.pickup_zone_id) {
        throw new HttpError(409, "Pickup zone does not match the open pool");
      }
      if (active.occupied_seats + ride.seats > active.capacity) {
        throw new HttpError(409, "Not enough free seats");
      }
      if (active.occupied_seats > 0) {
        const poolCorridor = await repo.poolCorridor(c, active.id);
        const rideCorridor = await repo.zoneCorridor(c, ride.destination_zone_id);
        if (poolCorridor && poolCorridor !== rideCorridor) {
          throw new HttpError(409, "Destination is not compatible with the open pool");
        }
      }
      if (!(await repo.addSeats(c, active.id, ride.seats))) {
        throw new HttpError(409, "Not enough free seats");
      }  
       poolId = active.id;
            
    }

    await repo.markMatched(c, ride.id, poolId);
    await repo.insertEvent(c, ride.id, "REQUESTED", "MATCHED", driverId);
    if ((await repo.countActivePassengers(c, poolId)) >= 2) {
      await repo.applyPoolDiscount(c, poolId, POOL_DISCOUNT_PERCENT);
    }
    const fresh = await repo.getRide(c, ride.id);
    return publicRide(fresh!);
  });
}
export type DriverAction = "arrive" | "start" | "complete";

const STEPS: Record<DriverAction, { from: string; to: string }> = {
  arrive: { from: "MATCHED", to: "DRIVER_ARRIVED" },
  start: { from: "DRIVER_ARRIVED", to: "STARTED" },
  complete: { from: "STARTED", to: "COMPLETED" },
};

export async function advance(driverId: string, rideId: string, action: DriverAction) {
  const step = STEPS[action];
  return withTx(async (c) => {
    // Lock order: vehicle, ride, pool (same as accept).
    const vehicle = await repo.lockVehicleByDriver(c, driverId);
    if (!vehicle) {
      throw new HttpError(404, "No vehicle registered");
    }
    const ride = await repo.lockRide(c, rideId);
    if (!ride) {
      throw new HttpError(404, "Ride not found");
    }
    const pool = await repo.lockActivePool(c, vehicle.id);
    if (!pool || ride.pool_id !== pool.id) {
      throw new HttpError(403, "This ride is not in your pool");
    }
    if (ride.status !== step.from) {
      throw new HttpError(409, `Cannot ${action} a ride that is ${ride.status}`);
    }

    if (action === "complete") {
      await repo.completeRide(c, ride.id);
    } else {
      await repo.setRideStatus(c, ride.id, step.to);
    }
    if (action === "start" && pool.status === "OPEN") {
      // First start closes the pool to new passengers.
      await repo.setPoolStatus(c, pool.id, "IN_PROGRESS");
    }
    await repo.insertEvent(c, ride.id, step.from, step.to, driverId);
    if (action === "complete" && (await repo.countActivePassengers(c, pool.id)) === 0) {
      await repo.setPoolStatus(c, pool.id, "COMPLETED");
    }
    const fresh = await repo.getRide(c, ride.id);
    return publicRide(fresh!);
  });
}

const CANCELLABLE = ["REQUESTED", "MATCHED", "DRIVER_ARRIVED"];

export async function cancel(actor: { userId: string; role: "PASSENGER" | "DRIVER" }, rideId: string) {
  return withTx(async (c) => {
    const link = await repo.findRideLink(c, rideId);
    if (!link) {
      throw new HttpError(404, "Ride not found");
    }
    // Ownership is decided on fields that never change, before taking any lock.
    const owns = actor.role === "PASSENGER" ? link.passenger_id === actor.userId : link.driver_id === actor.userId;
    if (!owns) {
      throw new HttpError(403, "Not your ride");
    }

    // Lock order: vehicle, ride, pool (same as accept and advance).
    if (link.vehicle_id) {
      await repo.lockVehicleById(c, link.vehicle_id);
    }
    const ride = await repo.lockRide(c, rideId);
    if (!ride) {
      throw new HttpError(404, "Ride not found");
    }
    if (ride.pool_id !== link.pool_id) {
      throw new HttpError(409, "Ride changed while cancelling, please retry");
    }
    if (!CANCELLABLE.includes(ride.status)) {
      throw new HttpError(409, `Cannot cancel a ride that is ${ride.status}`);
    }

    await repo.setRideStatus(c, ride.id, "CANCELLED");
    await repo.insertEvent(c, ride.id, ride.status, "CANCELLED", actor.userId);

    if (ride.pool_id) {
      const pool = await repo.lockPoolById(c, ride.pool_id);
      await repo.releaseSeats(c, ride.pool_id, ride.seats);
      const left = await repo.countActivePassengers(c, ride.pool_id);
      if (left === 0 && pool) {
        await repo.setPoolStatus(c, pool.id, pool.status === "IN_PROGRESS" ? "COMPLETED" : "CANCELLED");
      } else if (left === 1 && pool?.status === "OPEN") {
        // A lone passenger no longer gets the pool discount. Once the trip is in progress, fares stay frozen.
        await repo.clearPoolDiscount(c, ride.pool_id);
      }
    }
    const fresh = await repo.getRide(c, ride.id);
    return publicRide(fresh!);
  });
}

export async function events(actor: { userId: string; role: "PASSENGER" | "DRIVER" }, rideId: string) {
  return withTx(async (c) => {
    const link = await repo.findRideLink(c, rideId);
    if (!link) {
      throw new HttpError(404, "Ride not found");
    }
    const owns = actor.role === "PASSENGER" ? link.passenger_id === actor.userId : link.driver_id === actor.userId;
    if (!owns) {
      throw new HttpError(403, "Not your ride");
    }
    const rows = await repo.listEvents(c, rideId);
    return rows.map((e) => ({
      id: e.id,
      fromStatus: e.from_status,
      toStatus: e.to_status,
      actorRole: e.actor_id === link.passenger_id ? "PASSENGER" : "DRIVER",
      createdAt: e.created_at,
    }));
  });
}