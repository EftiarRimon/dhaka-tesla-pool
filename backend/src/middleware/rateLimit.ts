import rateLimit from "express-rate-limit";

// Counts per IP in memory. Fine for one API instance (see docs/03 for what changes at scale).
export function createAuthLimiter(max: number, windowMs = 15 * 60 * 1000) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts, please try again later" },
  });
}