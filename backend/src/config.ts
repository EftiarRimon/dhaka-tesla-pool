import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
});

export const config = schema.parse(process.env);