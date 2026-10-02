import { NextFunction, Request, Response, Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as zones from "../repositories/zones";

export const zonesRouter = Router();

zonesRouter.get("/", requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await zones.listZones());
  } catch (err) {
    next(err);
  }
});