import express, { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { pool } from "./db";
import { HttpError } from "./errors";
import { authRouter } from "./routes/auth";

export const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/db", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT count(*)::int AS zones FROM zones");
    res.json({ status: "ok", zones: rows[0].zones });
  } catch (err) {
    res.status(503).json({ status: "error", message: (err as Error).message });
  }
});

app.use("/auth", authRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", issues: err.issues });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});