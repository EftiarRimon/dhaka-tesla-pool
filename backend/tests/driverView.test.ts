import { beforeAll, describe, expect, it } from "vitest";
import { act, api, bearer, EMAIL, login, requestRide } from "./helpers";

interface PassengerView {
  name: string;
  seats: number;
  status: string;
  destinationZone: string;
  passengerFarePaisa: number;
  finalFarePaisa: number | null;
}

let jashim: string;
let nusrat: string;
let rafiq: string;

beforeAll(async () => {
  [jashim, nusrat, rafiq] = await Promise.all([login(EMAIL.jashim), login(EMAIL.nusrat), login(EMAIL.rafiq)]);
});

describe("Jashim's view of Bullet", () => {
  it("shows who is in the pool, how many seats, their stage and their own fare", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    const r = await requestRide(rafiq, "Banani", "Gulshan 1");
    await act(jashim, n, "accept");
    await act(jashim, r, "accept");
    await act(jashim, n, "arrive");

    const res = await api().get("/vehicles/me/pool").set(bearer(jashim));
    expect(res.status).toBe(200);
    expect(res.body.pool).toMatchObject({
      status: "OPEN",
      pickupZone: "Banani",
      capacity: 3,
      occupiedSeats: 2,
      freeSeats: 1,
    });
    const byName = Object.fromEntries(
      (res.body.pool.passengers as PassengerView[]).map((p) => [p.name, p])
    );
    expect(byName.Nusrat).toMatchObject({
      status: "DRIVER_ARRIVED",
      seats: 1,
      destinationZone: "Mohakhali",
      passengerFarePaisa: 5600,
    });
    expect(byName.Rafiq).toMatchObject({
      status: "MATCHED",
      destinationZone: "Gulshan 1",
      passengerFarePaisa: 6800,
    });
  });

  it("returns no pool while Bullet is empty", async () => {
    const res = await api().get("/vehicles/me/pool").set(bearer(jashim));
    expect(res.status).toBe(200);
    expect(res.body.pool).toBeNull();
  });

  it("drops a cancelled passenger from the pool view", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    const r = await requestRide(rafiq, "Banani", "Gulshan 1");
    await act(jashim, n, "accept");
    await act(jashim, r, "accept");
    await act(rafiq, r, "cancel");

    const res = await api().get("/vehicles/me/pool").set(bearer(jashim));
    expect(res.body.pool.occupiedSeats).toBe(1);
    expect((res.body.pool.passengers as PassengerView[]).map((p) => p.name)).toEqual(["Nusrat"]);
  });

  it("keeps finished rides in history and out of the current pool", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    await act(jashim, n, "accept");
    for (const step of ["arrive", "start", "complete"] as const) {
      await act(jashim, n, step);
    }

    const pool = await api().get("/vehicles/me/pool").set(bearer(jashim));
    expect(pool.body.pool).toBeNull();

    const history = await api().get("/vehicles/me/history").set(bearer(jashim));
    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toMatchObject({
      name: "Nusrat",
      status: "COMPLETED",
      pickupZone: "Banani",
      destinationZone: "Mohakhali",
      finalFarePaisa: 7000,
    });
  });

  it("keeps passengers out of the driver views", async () => {
    expect((await api().get("/vehicles/me/pool").set(bearer(nusrat))).status).toBe(403);
    expect((await api().get("/vehicles/me/history").set(bearer(nusrat))).status).toBe(403);
    expect((await api().get("/vehicles/me/pool")).status).toBe(401);
  });
});