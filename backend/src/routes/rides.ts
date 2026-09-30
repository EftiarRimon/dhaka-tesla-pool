import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import * as rides from "../services/rides";

export const ridesRouter = Router();
ridesRouter.use(requireAuth, requireRole("PASSENGER"));

const estimateSchema = z
  .object({
    pickupZoneId: z.number().int().positive(),
    destinationZoneId: z.number().int().positive(),
    seats: z.number().int().min(1).max(6),
  })
  .refine((v) => v.pickupZoneId !== v.destinationZoneId, {
    message: "Pickup and destination must differ",
    path: ["destinationZoneId"],
  });

ridesRouter.post("/estimate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await rides.estimate(estimateSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});