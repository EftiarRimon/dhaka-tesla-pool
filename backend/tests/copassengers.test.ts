import { beforeAll, describe, expect, it } from "vitest";
import { act, api, bearer, EMAIL, login, requestRide } from "./helpers";

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

const getCo = (token: string, rideId: string) => api().get(`/rides/${rideId}/copassengers`).set(bearer(token));

describe("pool co-passengers", () => {
  it("shows each matched passenger the other one, without contact details", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    const r = await requestRide(rafiq, "Banani", "Gulshan 1");
    await act(jashim, n, "accept");
    await act(jashim, r, "accept");

    const forNusrat = await getCo(nusrat, n);
    expect(forNusrat.status).toBe(200);
    expect(forNusrat.body).toHaveLength(1);
    expect(Object.keys(forNusrat.body[0]).sort()).toEqual(
      ["destinationZoneId", "firstName", "matchedAt", "pickupZoneId", "seats"].sort()
    );

    const forRafiq = await getCo(rafiq, r);
    expect(forRafiq.body).toHaveLength(1);
  });

  it("returns an empty list while the ride is not matched or is alone", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    expect((await getCo(nusrat, n)).body).toEqual([]);
    await act(jashim, n, "accept");
    expect((await getCo(nusrat, n)).body).toEqual([]);
  });

  it("does not let an outsider or someone else's ride owner peek", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    await act(jashim, n, "accept");
    expect((await getCo(shirin, n)).status).toBe(403);
    expect((await getCo(jashim, n)).status).toBe(403);
  });
});