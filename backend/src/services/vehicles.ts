import { HttpError } from "../errors";
import * as vehicles from "../repositories/vehicles";

function publicVehicle(v: vehicles.VehicleRow) {
  return { id: v.id, name: v.name, capacity: v.capacity, isOnline: v.is_online };
}

export async function register(driverId: string, name: string, capacity: number) {
  if (await vehicles.findByDriver(driverId)) {
    throw new HttpError(409, "Driver already has a vehicle");
  }
  try {
    return publicVehicle(await vehicles.insertVehicle(driverId, name, capacity));
  } catch (err) {
    // two requests racing: the UNIQUE(driver_id) constraint decides
    if ((err as { code?: string }).code === "23505") {
      throw new HttpError(409, "Driver already has a vehicle");
    }
    throw err;
  }
}

export async function getMine(driverId: string) {
  const v = await vehicles.findByDriver(driverId);
  if (!v) {
    throw new HttpError(404, "No vehicle registered");
  }
  return publicVehicle(v);
}

export async function setStatus(driverId: string, online: boolean) {
  const v = await vehicles.findByDriver(driverId);
  if (!v) {
    throw new HttpError(404, "No vehicle registered");
  }
  if (!online && (await vehicles.hasRidersOnBoard(v.id))) {
    throw new HttpError(409, "Cannot go offline with riders on board");
  }
  const updated = await vehicles.setOnline(driverId, online);
  return publicVehicle(updated!);
}


function publicPassenger(r: vehicles.PoolPassengerRow) {
  return {
    rideId: r.ride_id,
    name: r.passenger_name,
    seats: r.seats,
    status: r.status,
    destinationZone: r.destination_zone,
    passengerFarePaisa: r.estimated_fare_paisa - r.discount_paisa,
    finalFarePaisa: r.final_fare_paisa,
  };
}

export async function getCurrentPool(driverId: string) {
  const v = await vehicles.findByDriver(driverId);
  if (!v) {
    throw new HttpError(404, "No vehicle registered");
  }
  const p = await vehicles.findActivePool(v.id);
  if (!p) {
    return { pool: null };
  }
  const passengers = await vehicles.listPoolPassengers(p.id);
  return {
    pool: {
      id: p.id,
      status: p.status,
      pickupZone: p.pickup_zone,
      capacity: p.capacity,
      occupiedSeats: p.occupied_seats,
      freeSeats: p.capacity - p.occupied_seats,
      passengers: passengers.map(publicPassenger),
    },
  };
}

export async function getHistory(driverId: string) {
  const v = await vehicles.findByDriver(driverId);
  if (!v) {
    throw new HttpError(404, "No vehicle registered");
  }
  const rows = await vehicles.listHistory(v.id);
  return rows.map((r) => ({
    ...publicPassenger(r),
    poolId: r.pool_id,
    pickupZone: r.pickup_zone,
    finishedAt: r.updated_at,
  }));
}