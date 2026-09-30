import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import * as vehicles from "../services/vehicles";

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth, requireRole("DRIVER"));

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  capacity: z.number().int().min(1).max(6),
});

const statusSchema = z.object({ online: z.boolean() });

vehiclesRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, capacity } = createSchema.parse(req.body);
    res.status(201).json(await vehicles.register(req.auth!.userId, name, capacity));
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await vehicles.getMine(req.auth!.userId));
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.patch("/me/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { online } = statusSchema.parse(req.body);
    res.json(await vehicles.setStatus(req.auth!.userId, online));
  } catch (err) {
    next(err);
  }
});