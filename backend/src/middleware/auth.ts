import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { HttpError } from "../errors";
import type { Role } from "../repositories/users";

declare module "express-serve-static-core" {
  interface Request {
    auth?: { userId: string; role: Role };
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new HttpError(401, "Missing token"));
  }
  try {
    const payload = jwt.verify(header.slice(7), config.JWT_SECRET) as jwt.JwtPayload;
    req.auth = { userId: String(payload.sub), role: payload.role as Role };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function requireRole(role: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.auth?.role !== role) {
      return next(new HttpError(403, "Forbidden"));
    }
    next();
  };
}