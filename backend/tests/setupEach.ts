import { afterAll, beforeEach } from "vitest";
import { pool } from "../src/db";

beforeEach(async () => {
  await pool.query("TRUNCATE ride_events, rides, pools RESTART IDENTITY CASCADE");
  await pool.query("UPDATE vehicles SET is_online = true");
});

afterAll(async () => {
  await pool.end();
});