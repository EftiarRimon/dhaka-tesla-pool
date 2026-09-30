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