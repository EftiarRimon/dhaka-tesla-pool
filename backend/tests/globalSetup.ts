import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "./testUrl";

function sqlFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(resolve(dir, f), "utf8"));
}

export default async function setup() {
  // Safety net: this script drops everything, so it must never touch the dev database.
  if (!/_test(\?|$)/.test(TEST_DATABASE_URL)) {
    throw new Error(`Refusing to reset a database that is not named *_test: ${TEST_DATABASE_URL}`);
  }
  const root = resolve(__dirname, "../../db");
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    for (const sql of sqlFiles(resolve(root, "migrations"))) {
      await client.query(sql);
    }
    for (const sql of sqlFiles(resolve(root, "seed"))) {
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}