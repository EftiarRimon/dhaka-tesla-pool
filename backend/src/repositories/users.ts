import { pool } from "../db";

export type Role = "PASSENGER" | "DRIVER";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: Date;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function insertUser(
  name: string,
  email: string,
  passwordHash: string,
  role: Role
): Promise<UserRow> {
  const { rows } = await pool.query<UserRow>(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, email, passwordHash, role]
  );
  return rows[0];
}