import { NextFunction, Request, Response } from "express";
import { log } from "../logger";

export function requestLog(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    if (req.originalUrl.startsWith("/health")) return;
    log("info", "request", {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      ms: Math.round(Number(process.hrtime.bigint() - start) / 1e6),
      userId: req.auth?.userId,
    });
  });
  next();
}