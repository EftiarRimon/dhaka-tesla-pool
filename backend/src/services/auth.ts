import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { HttpError } from "../errors";
import * as users from "../repositories/users";

function publicUser(u: users.UserRow) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function sign(u: users.UserRow): string {
  return jwt.sign({ role: u.role }, config.JWT_SECRET, { subject: u.id, expiresIn: "1h" });
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  role: users.Role;
}) {
  const email = input.email.toLowerCase();
  if (await users.findByEmail(email)) {
    throw new HttpError(409, "Email already registered");
  }
  const hash = await bcrypt.hash(input.password, 10);
  try {
    const u = await users.insertUser(input.name, email, hash, input.role);
    return { user: publicUser(u), token: sign(u) };
  } catch (err) {
    // two requests racing with the same email: the UNIQUE constraint decides
    if ((err as { code?: string }).code === "23505") {
      throw new HttpError(409, "Email already registered");
    }
    throw err;
  }
}

export async function login(emailInput: string, password: string) {
  const u = await users.findByEmail(emailInput.toLowerCase());
  const ok = u ? await bcrypt.compare(password, u.password_hash) : false;
  if (!u || !ok) {
    throw new HttpError(401, "Invalid email or password");
  }
  return { user: publicUser(u), token: sign(u) };
}

export async function getProfile(userId: string) {
  const u = await users.findById(userId);
  if (!u) {
    throw new HttpError(404, "User not found");
  }
  return publicUser(u);
}