import { beforeAll, describe, expect, it } from "vitest";
import { pool } from "../src/db";
import { act, EMAIL, login, poolState, requestRide } from "./helpers";

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

describe("last seat race: Nusrat vs Shirin", () => {
  it.each([1, 2, 3, 4, 5])("round %i: exactly one wins and Bullet stays at 3 seats", async () => {
    const rafiqRide = await requestRide(rafiq, "Banani", "Gulshan 1", 2);
    expect((await act(jashim, rafiqRide, "accept")).status).toBe(200); // 2 of 3 seats taken

    const n = await requestRide(nusrat, "Banani", "Mohakhali", 1);
    const s = await requestRide(shirin, "Banani", "Gulshan 1", 1);

    const [a, b] = await Promise.all([act(jashim, n, "accept"), act(jashim, s, "accept")]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);

    expect(await poolState()).toMatchObject({ occupied_seats: 3, capacity: 3 });

    const matched = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM rides WHERE status = 'MATCHED'");
    expect(matched.rows[0].n).toBe(2); // Rafiq plus exactly one of Nusrat and Shirin

    const loserId = a.status === 409 ? n : s;
    const loser = await pool.query<{ status: string }>("SELECT status FROM rides WHERE id = $1", [loserId]);
    expect(loser.rows[0].status).toBe("REQUESTED");
  });
});