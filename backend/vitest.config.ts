import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/testUrl";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    setupFiles: ["tests/setupEach.ts"],
    // All files share one database, so run them one after another.
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: "test-secret-not-for-production",
       AUTH_RATE_LIMIT_MAX: "1000",
    },
  },
});