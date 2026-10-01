import { beforeAll, describe, expect, it } from "vitest";
import { pool } from "../src/db";
import { act, api, bearer, EMAIL, login, myRides, poolState, requestRide } from "./helpers";

let jashim: string;
let nusrat: string;
let rafiq: string;
let shirin: string;

beforeAll(async () => {
  [jashim, nusrat, rafiq, shirin] = await Promise.all([
    login(EMAIL.jashim),
    login(EMAIL.nusrat),
    login(EMAIL.rafiq),
    login(EMAIL.shirin),
  ]);
});

describe("pooling Nusrat and Rafiq in Bullet", () => {
  it("shares one pool and gives each passenger their own pooled fare", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    const r = await requestRide(rafiq, "Banani", "Gulshan 1");
    expect((await act(jashim, n, "accept")).status).toBe(200);
    expect((await act(jashim, r, "accept")).status).toBe(200);

    const [nr] = await myRides(nusrat);
    const [rr] = await myRides(rafiq);
    expect(nr.passengerFarePaisa).toBe(5600);
    expect(rr.passengerFarePaisa).toBe(6800);
    expect(nr.poolId).toBeTruthy();
    expect(nr.poolId).toBe(rr.poolId);
    expect(await poolState()).toMatchObject({ occupied_seats: 2, capacity: 3 });
  });

  it("never lets Bullet go past 3 seats", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali", 2);
    const r = await requestRide(rafiq, "Banani", "Gulshan 1", 1);
    const s = await requestRide(shirin, "Banani", "Gulshan 1", 1);
    expect((await act(jashim, n, "accept")).status).toBe(200);
    expect((await act(jashim, r, "accept")).status).toBe(200);

    const res = await act(jashim, s, "accept");
    expect(res.status).toBe(409);
    expect(await poolState()).toMatchObject({ occupied_seats: 3, capacity: 3 });
    const [sr] = await myRides(shirin);
    expect(sr.status).toBe("REQUESTED");
  });

  it("refuses a request bigger than the whole Tesla", async () => {
    const s = await requestRide(shirin, "Banani", "Gulshan 1", 4);
    expect((await act(jashim, s, "accept")).status).toBe(409);
    expect(await poolState()).toBeNull();
  });

  it("does not accept rides while Jashim is offline", async () => {
    const off = await api().patch("/vehicles/me/status").set(bearer(jashim)).send({ online: false });
    expect(off.status).toBe(200);
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    expect((await act(jashim, n, "accept")).status).toBe(409);
  });

  it("the database itself refuses to exceed capacity, even if app code is wrong", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    await act(jashim, n, "accept");
    await expect(pool.query("UPDATE pools SET occupied_seats = 4")).rejects.toThrow(/pools_seats_within_capacity/);
  });
});