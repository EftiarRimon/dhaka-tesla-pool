import { pool } from "../db";

export interface VehicleRow {
  id: string;
  driver_id: string;
  name: string;
  capacity: number;
  is_online: boolean;
}

export async function findByDriver(driverId: string): Promise<VehicleRow | null> {
  const { rows } = await pool.query<VehicleRow>("SELECT * FROM vehicles WHERE driver_id = $1", [driverId]);
  return rows[0] ?? null;
}

export async function insertVehicle(driverId: string, name: string, capacity: number): Promise<VehicleRow> {
  const { rows } = await pool.query<VehicleRow>(
    "INSERT INTO vehicles (driver_id, name, capacity) VALUES ($1, $2, $3) RETURNING *",
    [driverId, name, capacity]
  );
  return rows[0];
}

export async function setOnline(driverId: string, online: boolean): Promise<VehicleRow | null> {
  const { rows } = await pool.query<VehicleRow>(
    "UPDATE vehicles SET is_online = $2 WHERE driver_id = $1 RETURNING *",
    [driverId, online]
  );
  return rows[0] ?? null;
}

export async function hasRidersOnBoard(vehicleId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM pools WHERE vehicle_id = $1 AND status IN ('OPEN', 'IN_PROGRESS') AND occupied_seats > 0 LIMIT 1",
    [vehicleId]
  );
  return (rowCount ?? 0) > 0;
}


export interface ActivePoolRow {
  id: string;
  status: string;
  capacity: number;
  occupied_seats: number;
  pickup_zone: string;
}

export interface PoolPassengerRow {
  ride_id: string;
  passenger_name: string;
  seats: number;
  status: string;
  destination_zone: string;
  estimated_fare_paisa: number;
  discount_paisa: number;
  final_fare_paisa: number | null;
}

// Plain reads, no locks: this is a view for the driver's screen, not a state change.
export async function findActivePool(vehicleId: string): Promise<ActivePoolRow | null> {
  const { rows } = await pool.query<ActivePoolRow>(
    "SELECT p.id, p.status, p.capacity, p.occupied_seats, z.name AS pickup_zone FROM pools p JOIN zones z ON z.id = p.pickup_zone_id WHERE p.vehicle_id = $1 AND p.status IN ('OPEN', 'IN_PROGRESS')",
    [vehicleId]
  );
  return rows[0] ?? null;
}

// Cancelled rides drop out of the pool view. Completed ones stay until the whole pool finishes.
export async function listPoolPassengers(poolId: string): Promise<PoolPassengerRow[]> {
  const { rows } = await pool.query<PoolPassengerRow>(
    "SELECT r.id AS ride_id, u.name AS passenger_name, r.seats, r.status, dz.name AS destination_zone, r.estimated_fare_paisa, r.discount_paisa, r.final_fare_paisa FROM rides r JOIN users u ON u.id = r.passenger_id JOIN zones dz ON dz.id = r.destination_zone_id WHERE r.pool_id = $1 AND r.status <> 'CANCELLED' ORDER BY r.created_at",
    [poolId]
  );
  return rows;
}

export interface HistoryRow extends PoolPassengerRow {
  pool_id: string;
  pickup_zone: string;
  updated_at: Date;
}

export async function listHistory(vehicleId: string): Promise<HistoryRow[]> {
  const { rows } = await pool.query<HistoryRow>(
    "SELECT r.id AS ride_id, r.pool_id, u.name AS passenger_name, r.seats, r.status, pz.name AS pickup_zone, dz.name AS destination_zone, r.estimated_fare_paisa, r.discount_paisa, r.final_fare_paisa, r.updated_at FROM rides r JOIN pools p ON p.id = r.pool_id JOIN users u ON u.id = r.passenger_id JOIN zones pz ON pz.id = r.pickup_zone_id JOIN zones dz ON dz.id = r.destination_zone_id WHERE p.vehicle_id = $1 AND p.status IN ('COMPLETED', 'CANCELLED') ORDER BY r.updated_at DESC LIMIT 30",
    [vehicleId]
  );
  return rows;
}