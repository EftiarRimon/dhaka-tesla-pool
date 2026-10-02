import { beforeAll, describe, expect, it } from "vitest";
import { pool } from "../src/db";
import { api, bearer, EMAIL, login, zoneId } from "./helpers";

let nusrat: string;

beforeAll(async () => {
  nusrat = await login(EMAIL.nusrat);
});

describe("zone distances", () => {
  it("has a distance for every ordered pair of zones", async () => {
    const { rows } = await pool.query<{ zones: number; pairs: number }>(
      "SELECT (SELECT count(*)::int FROM zones) AS zones, (SELECT count(*)::int FROM zone_distances) AS pairs"
    );
    expect(rows[0].pairs).toBe(rows[0].zones * (rows[0].zones - 1));
  });

  it("is symmetric, so a trip costs the same in both directions", async () => {
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n
         FROM zone_distances a
         JOIN zone_distances b
           ON a.from_zone_id = b.to_zone_id AND a.to_zone_id = b.from_zone_id
        WHERE a.distance_km <> b.distance_km`
    );
    expect(rows[0].n).toBe(0);
  });

  it("quotes a ride that does not start in Banani: Mohakhali to Gulshan 1 is 3 km, 8500 paisa", async () => {
    const res = await api()
      .post("/rides/estimate")
      .set(bearer(nusrat))
      .send({
        pickupZoneId: await zoneId("Mohakhali"),
        destinationZoneId: await zoneId("Gulshan 1"),
        seats: 1,
      });
    expect(res.status).toBe(200);
    expect(res.body.distanceKm).toBe(3);
    expect(res.body.estimatedFarePaisa).toBe(8500);
  });
});