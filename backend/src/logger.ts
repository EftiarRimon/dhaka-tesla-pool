type Level = "info" | "warn" | "error";

// One JSON object per line, so any log tool can parse it. Silent under vitest.
export function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields });
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}