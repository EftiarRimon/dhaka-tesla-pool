import { beforeAll, describe, expect, it } from "vitest";
import { act, api, bearer, EMAIL, login, myRides, requestRide } from "./helpers";

let jashim: string;
let nusrat: string;
let rafiq: string;

beforeAll(async () => {
  [jashim, nusrat, rafiq] = await Promise.all([login(EMAIL.jashim), login(EMAIL.nusrat), login(EMAIL.rafiq)]);
});

describe("access control", () => {
  it("does not let Nusrat cancel Rafiq's ride", async () => {
    const r = await requestRide(rafiq, "Banani", "Gulshan 1");
    expect((await act(nusrat, r, "cancel")).status).toBe(403);
    expect((await myRides(rafiq))[0].status).toBe("REQUESTED");
  });

  it("shows each passenger only their own rides and fares", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    const r = await requestRide(rafiq, "Banani", "Gulshan 1");
    const nusratRides = await myRides(nusrat);
    const rafiqRides = await myRides(rafiq);
    expect(nusratRides.map((x) => x.id)).toEqual([n]);
    expect(rafiqRides.map((x) => x.id)).toEqual([r]);
  });

  it("does not let Jashim cancel a ride that is not in his pool", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    expect((await act(jashim, n, "cancel")).status).toBe(403);
  });

  it("keeps driver actions away from passengers and ride requests away from drivers", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    expect((await act(nusrat, n, "accept")).status).toBe(403);
    const res = await api().post("/rides").set(bearer(jashim)).send({ pickupZoneId: 1, destinationZoneId: 2, seats: 1 });
    expect(res.status).toBe(403);
  });

  it("rejects requests without a token", async () => {
    expect((await api().get("/rides/me")).status).toBe(401);
    expect((await api().post("/rides").send({})).status).toBe(401);
  });
});
