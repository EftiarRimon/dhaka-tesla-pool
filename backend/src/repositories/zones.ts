import { pool } from "../db";

export interface ZoneRow {
  id: number;
  name: string;
  corridor: "EAST" | "NORTH" | "CENTRAL";
}

export async function listZones(): Promise<ZoneRow[]> {
  const { rows } = await pool.query<ZoneRow>("SELECT id, name, corridor FROM zones ORDER BY id");
  return rows;
}

export async function countExisting(ids: number[]): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM zones WHERE id = ANY($1::int[])",
    [ids]
  );
  return rows[0].n;
}

export async function findDistanceKm(a: number, b: number): Promise<number | null> {
  const { rows } = await pool.query<{ distance_km: number }>(
    "SELECT distance_km FROM zone_distances WHERE (from_zone_id = $1 AND to_zone_id = $2) OR (from_zone_id = $2 AND to_zone_id = $1) LIMIT 1",
    [a, b]
  );
  return rows[0]?.distance_km ?? null;
}