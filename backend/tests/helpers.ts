import request from "supertest";
import { app } from "../src/app";
import { pool } from "../src/db";

export const api = () => request(app);

export const PASSWORD = "password123";

export const EMAIL = {
  jashim: "jashim@example.com",
  nusrat: "nusrat@example.com",
  rafiq: "rafiq@example.com",
  shirin: "shirin@example.com",
};

export interface RideBody {
  id: string;
  status: string;
  poolId: string | null;
  seats: number;
  estimatedFarePaisa: number;
  discountPaisa: number;
  passengerFarePaisa: number;
  finalFarePaisa: number | null;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function login(email: string): Promise<string> {
  const res = await api().post("/auth/login").send({ email, password: PASSWORD });
  const token = res.body?.token ?? res.body?.accessToken;
  if (res.status !== 200 || !token) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return token as string;
}

export async function zoneId(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>("SELECT id FROM zones WHERE name = $1", [name]);
  if (!rows[0]) {
    throw new Error(`Zone not found: ${name}`);
  }
  return rows[0].id;
}

export async function requestRide(token: string, from: string, to: string, seats = 1): Promise<string> {
  const res = await api()
    .post("/rides")
    .set(bearer(token))
    .send({ pickupZoneId: await zoneId(from), destinationZoneId: await zoneId(to), seats });
  if (res.status !== 201) {
    throw new Error(`requestRide failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.id as string;
}

export function act(token: string, rideId: string, action: "accept" | "arrive" | "start" | "complete" | "cancel") {
  return api().post(`/rides/${rideId}/${action}`).set(bearer(token));
}

export async function myRides(token: string): Promise<RideBody[]> {
  const res = await api().get("/rides/me").set(bearer(token));
  return res.body as RideBody[];
}

// The most recently created pool, straight from the database.
export async function poolState() {
  const { rows } = await pool.query<{ occupied_seats: number; capacity: number; status: string }>(
    "SELECT occupied_seats, capacity, status FROM pools ORDER BY created_at DESC LIMIT 1"
  );
  return rows[0] ?? null;
}