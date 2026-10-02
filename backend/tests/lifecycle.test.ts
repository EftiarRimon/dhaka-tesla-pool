import { beforeAll, describe, expect, it } from "vitest";
import { pool } from "../src/db";
import { act, EMAIL, login, myRides, poolState, requestRide } from "./helpers";

let jashim: string;
let nusrat: string;
let rafiq: string;

beforeAll(async () => {
  [jashim, nusrat, rafiq] = await Promise.all([login(EMAIL.jashim), login(EMAIL.nusrat), login(EMAIL.rafiq)]);
});

describe("ride lifecycle", () => {
  it("walks a solo ride to COMPLETED and records every step", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    expect((await act(jashim, n, "accept")).status).toBe(200);
    for (const step of ["arrive", "start", "complete"] as const) {
      expect((await act(jashim, n, step)).status).toBe(200);
    }
    const [ride] = await myRides(nusrat);
    expect(ride.status).toBe("COMPLETED");
    expect(ride.finalFarePaisa).toBe(7000);
    expect((await poolState())?.status).toBe("COMPLETED");

    const { rows } = await pool.query<{ to_status: string }>(
      "SELECT to_status FROM ride_events WHERE ride_id = $1 ORDER BY id",
      [n]
    );
    expect(rows.map((e) => e.to_status)).toEqual([
      "REQUESTED",
      "MATCHED",
      "DRIVER_ARRIVED",
      "STARTED",
      "COMPLETED",
    ]);
  });

  it("rejects out-of-order driver actions with 409", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    await act(jashim, n, "accept");
    expect((await act(jashim, n, "start")).status).toBe(409);
    expect((await act(jashim, n, "complete")).status).toBe(409);
    expect((await act(jashim, n, "arrive")).status).toBe(200);
    expect((await act(jashim, n, "arrive")).status).toBe(409);
    expect((await act(jashim, n, "accept")).status).toBe(409);
  });

  it("allows only one active ride per passenger", async () => {
    await requestRide(nusrat, "Banani", "Mohakhali");
    await expect(requestRide(nusrat, "Banani", "Gulshan 1")).rejects.toThrow(/409/);
  });
});

describe("cancellation rules", () => {
  it("lets a passenger cancel a ride that is still REQUESTED", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    expect((await act(nusrat, n, "cancel")).status).toBe(200);
    const [ride] = await myRides(nusrat);
    expect(ride.status).toBe("CANCELLED");
    expect((await act(nusrat, n, "cancel")).status).toBe(409);
  });

  it("frees the seat and drops the pool discount when Rafiq cancels", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    const r = await requestRide(rafiq, "Banani", "Gulshan 1");
    await act(jashim, n, "accept");
    await act(jashim, r, "accept");
    expect((await myRides(nusrat))[0].passengerFarePaisa).toBe(5600);

    expect((await act(rafiq, r, "cancel")).status).toBe(200);
    expect(await poolState()).toMatchObject({ occupied_seats: 1, status: "OPEN" });
    // Nusrat rides alone again, so her fare is back to the solo price.
    expect((await myRides(nusrat))[0].passengerFarePaisa).toBe(7000);
  });

  it("cancels the pool when its only passenger cancels, so the seats can be reused", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    await act(jashim, n, "accept");
    await act(nusrat, n, "cancel");
    expect(await poolState()).toMatchObject({ occupied_seats: 0, status: "CANCELLED" });

    const r = await requestRide(rafiq, "Banani", "Gulshan 1");
    expect((await act(jashim, r, "accept")).status).toBe(200);
  });

  it("rejects cancellation once the trip has STARTED", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    await act(jashim, n, "accept");
    await act(jashim, n, "arrive");
    await act(jashim, n, "start");
    expect((await act(nusrat, n, "cancel")).status).toBe(409);
    expect((await myRides(nusrat))[0].status).toBe("STARTED");
  });
});