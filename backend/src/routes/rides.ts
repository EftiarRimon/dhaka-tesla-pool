import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import * as rides from "../services/rides";

export const ridesRouter = Router();
ridesRouter.use(requireAuth);

const passenger = requireRole("PASSENGER");
const driver = requireRole("DRIVER");

const rideSchema = z
  .object({
    pickupZoneId: z.number().int().positive(),
    destinationZoneId: z.number().int().positive(),
    seats: z.number().int().min(1).max(6),
  })
  .refine((v) => v.pickupZoneId !== v.destinationZoneId, {
    message: "Pickup and destination must differ",
    path: ["destinationZoneId"],
  });

ridesRouter.post("/estimate", passenger, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await rides.estimate(rideSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

ridesRouter.post("/", passenger, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await rides.create(req.auth!.userId, rideSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

ridesRouter.get("/me", passenger, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await rides.listMine(req.auth!.userId));
  } catch (err) {
    next(err);
  }
});

ridesRouter.get("/available", driver, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await rides.listAvailable());
  } catch (err) {
    next(err);
  }
});

ridesRouter.post("/:id/accept", driver, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    res.json(await rides.accept(req.auth!.userId, id));
  } catch (err) {
    next(err);
  }
});