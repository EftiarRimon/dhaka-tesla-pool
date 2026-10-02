import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import * as auth from "../services/auth";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["PASSENGER", "DRIVER"]),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

authRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    res.status(201).json(await auth.register(input));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    res.json(await auth.login(email, password));
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await auth.getProfile(req.auth!.userId));
  } catch (err) {
    next(err);
  }
});