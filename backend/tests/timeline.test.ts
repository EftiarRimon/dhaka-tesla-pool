import { beforeAll, describe, expect, it } from "vitest";
import { act, api, bearer, EMAIL, login, requestRide } from "./helpers";

let jashim: string;
let nusrat: string;
let rafiq: string;

beforeAll(async () => {
  [jashim, nusrat, rafiq] = await Promise.all([login(EMAIL.jashim), login(EMAIL.nusrat), login(EMAIL.rafiq)]);
});

const getEvents = (token: string, rideId: string) => api().get(`/rides/${rideId}/events`).set(bearer(token));

describe("ride timeline", () => {
  it("returns every step in order for the passenger and the driver", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    await act(jashim, n, "accept");
    await act(jashim, n, "arrive");

    const forPassenger = await getEvents(nusrat, n);
    expect(forPassenger.status).toBe(200);
    expect(forPassenger.body.map((e: { toStatus: string }) => e.toStatus)).toEqual([
      "REQUESTED",
      "MATCHED",
      "DRIVER_ARRIVED",
    ]);
    expect(forPassenger.body[0]).toMatchObject({ fromStatus: null, actorRole: "PASSENGER" });
    expect(forPassenger.body[1]).toMatchObject({ fromStatus: "REQUESTED", actorRole: "DRIVER" });

    expect((await getEvents(jashim, n)).status).toBe(200);
  });

  it("hides the timeline from other passengers", async () => {
    const n = await requestRide(nusrat, "Banani", "Mohakhali");
    expect((await getEvents(rafiq, n)).status).toBe(403);
  });

  it("returns 404 for an unknown ride", async () => {
    const res = await getEvents(nusrat, "00000000-0000-4000-8000-000000000000");
    expect(res.status).toBe(404);
  });

  it("rejects a bad id", async () => {
    expect((await getEvents(nusrat, "not-a-uuid")).status).toBe(400);
  });
});