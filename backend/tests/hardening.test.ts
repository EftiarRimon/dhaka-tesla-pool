import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuthLimiter } from "../src/middleware/rateLimit";
import { api } from "./helpers";

describe("API hardening", () => {
  it("sends security headers and hides the framework", async () => {
    const res = await api().get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("rejects an oversized request body with 413", async () => {
    const res = await api()
      .post("/auth/login")
      .send({ email: "nusrat@example.com", password: "x".repeat(20000) });
    expect(res.status).toBe(413);
  });

  it("answers 429 once an IP passes the attempt limit", async () => {
    const small = express();
    small.use(createAuthLimiter(3));
    small.post("/login", (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 3; i++) {
      expect((await request(small).post("/login")).status).toBe(200);
    }
    expect((await request(small).post("/login")).status).toBe(429);
  });
});