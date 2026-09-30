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
      await repo.addSeats(c, active.id, ride.seats);
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