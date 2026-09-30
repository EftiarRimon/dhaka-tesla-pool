import express from "express";
import { pool } from "./db";

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