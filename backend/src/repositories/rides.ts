import type { PoolClient } from "pg";
import { pool } from "../db";

export interface RideRow {
  id: string;
  passenger_id: string;
  pool_id: string | null;
  pickup_zone_id: number;
  destination_zone_id: number;
  seats: number;
  status: string;
  estimated_fare_paisa: number;
  discount_paisa: number;
  final_fare_paisa: number | null;
  created_at: Date;
}

export interface PoolRow {
  id: string;
  vehicle_id: string;
  pickup_zone_id: number;
  capacity: number;
  occupied_seats: number;
  status: string;
}

export interface VehicleLock {
  id: string;
  capacity: number;
  is_online: boolean;
}

export async function insertRide(
  c: PoolClient,
  passengerId: string,
  pickupZoneId: number,
  destinationZoneId: number,
  seats: number,
  estimatedFarePaisa: number
): Promise<RideRow> {
  const { rows } = await c.query<RideRow>(
    "INSERT INTO rides (passenger_id, pickup_zone_id, destination_zone_id, seats, estimated_fare_paisa) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [passengerId, pickupZoneId, destinationZoneId, seats, estimatedFarePaisa]
  );
  return rows[0];
}

export async function insertEvent(
  c: PoolClient,
  rideId: string,
  fromStatus: string | null,
  toStatus: string,
  actorId: string
): Promise<void> {
  await c.query(
    "INSERT INTO ride_events (ride_id, from_status, to_status, actor_id) VALUES ($1, $2, $3, $4)",
    [rideId, fromStatus, toStatus, actorId]
  );
}

export async function getRide(c: PoolClient, id: string): Promise<RideRow | null> {
  const { rows } = await c.query<RideRow>("SELECT * FROM rides WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function lockRide(c: PoolClient, id: string): Promise<RideRow | null> {
  const { rows } = await c.query<RideRow>("SELECT * FROM rides WHERE id = $1 FOR UPDATE", [id]);
  return rows[0] ?? null;
}

export async function lockVehicleByDriver(c: PoolClient, driverId: string): Promise<VehicleLock | null> {
  const { rows } = await c.query<VehicleLock>(
    "SELECT id, capacity, is_online FROM vehicles WHERE driver_id = $1 FOR UPDATE",
    [driverId]
  );
  return rows[0] ?? null;
}

export async function lockActivePool(c: PoolClient, vehicleId: string): Promise<PoolRow | null> {
  const { rows } = await c.query<PoolRow>(
    "SELECT * FROM pools WHERE vehicle_id = $1 AND status IN ('OPEN', 'IN_PROGRESS') FOR UPDATE",
    [vehicleId]
  );
  return rows[0] ?? null;
}

export async function createPool(
  c: PoolClient,
  vehicleId: string,
  pickupZoneId: number,
  capacity: number,
  seats: number
): Promise<PoolRow> {
  const { rows } = await c.query<PoolRow>(
    "INSERT INTO pools (vehicle_id, pickup_zone_id, capacity, occupied_seats) VALUES ($1, $2, $3, $4) RETURNING *",
    [vehicleId, pickupZoneId, capacity, seats]
  );
  return rows[0];
}

export async function addSeats(c: PoolClient, poolId: string, seats: number): Promise<void> {
  await c.query("UPDATE pools SET occupied_seats = occupied_seats + $2 WHERE id = $1", [poolId, seats]);
}

export async function zoneCorridor(c: PoolClient, zoneId: number): Promise<string | null> {
  const { rows } = await c.query<{ corridor: string }>("SELECT corridor FROM zones WHERE id = $1", [zoneId]);
  return rows[0]?.corridor ?? null;
}

// All active passengers in a pool share one corridor, so any one of them will do.
export async function poolCorridor(c: PoolClient, poolId: string): Promise<string | null> {
  const { rows } = await c.query<{ corridor: string }>(
    "SELECT z.corridor FROM rides r JOIN zones z ON z.id = r.destination_zone_id WHERE r.pool_id = $1 AND r.status IN ('MATCHED', 'DRIVER_ARRIVED', 'STARTED') LIMIT 1",
    [poolId]
  );
  return rows[0]?.corridor ?? null;
}

export async function markMatched(c: PoolClient, rideId: string, poolId: string): Promise<void> {
  await c.query("UPDATE rides SET pool_id = $2, status = 'MATCHED', updated_at = now() WHERE id = $1", [rideId, poolId]);
}

export async function countActivePassengers(c: PoolClient, poolId: string): Promise<number> {
  const { rows } = await c.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM rides WHERE pool_id = $1 AND status IN ('MATCHED', 'DRIVER_ARRIVED', 'STARTED')",
    [poolId]
  );
  return rows[0].n;
}

// Integer division in Postgres floors positive values, same as floor(subtotal x 20 / 100).
export async function applyPoolDiscount(c: PoolClient, poolId: string, percent: number): Promise<void> {
  await c.query(
    "UPDATE rides SET discount_paisa = (estimated_fare_paisa * $2::int) / 100, updated_at = now() WHERE pool_id = $1 AND status IN ('MATCHED', 'DRIVER_ARRIVED', 'STARTED')",
    [poolId, percent]
  );
}

export async function listByPassenger(passengerId: string): Promise<RideRow[]> {
  const { rows } = await pool.query<RideRow>(
    "SELECT * FROM rides WHERE passenger_id = $1 ORDER BY created_at DESC LIMIT 20",
    [passengerId]
  );
  return rows;
}

export async function listRequested(): Promise<RideRow[]> {
  const { rows } = await pool.query<RideRow>(
    "SELECT * FROM rides WHERE status = 'REQUESTED' ORDER BY created_at LIMIT 20"
  );
  return rows;
}