import express, { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { pool } from "./db";
import { HttpError } from "./errors";
import { authRouter } from "./routes/auth";
import { ridesRouter } from "./routes/rides";
import { vehiclesRouter } from "./routes/vehicles";
import { zonesRouter } from "./routes/zones";
import { log } from "./logger";
import { requestLog } from "./middleware/requestLog";
import helmet from "helmet";
import { config } from "./config";
import { createAuthLimiter } from "./middleware/rateLimit";

export const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(requestLog);
app.use(express.json({ limit: "10kb" }));
const authLimiter = createAuthLimiter(config.AUTH_RATE_LIMIT_MAX);
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);

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
app.use("/vehicles", vehiclesRouter);
app.use("/zones", zonesRouter);
app.use("/rides", ridesRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", issues: err.issues });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if ((err as { type?: string }).type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
   if ((err as { type?: string }).type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }
  log("error", "unhandled error", { stack: (err as Error).stack });
  res.status(500).json({ error: "Internal server error" });
});