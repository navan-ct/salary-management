import { env } from "node:process";

import { defineConfig, devices } from "@playwright/test";

import { loadWorkspaceEnv } from "./tooling/load-env.js";
import { testDatabaseUrl } from "./tooling/test-database.js";

loadWorkspaceEnv();

const port = Number(env.E2E_PORT ?? "3100");

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("E2E_PORT must be an integer between 1 and 65535.");
}

const baseURL = `http://127.0.0.1:${String(port)}`;
const snapshotPathTemplate = "{testDir}/../snapshots/{testFileName}-{projectName}-{arg}{ext}";

export default defineConfig({
  testDir: "./tests/e2e",
  snapshotPathTemplate,
  expect: { toMatchAriaSnapshot: { pathTemplate: snapshotPathTemplate } },
  fullyParallel: true,
  forbidOnly: Boolean(env.CI),
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node apps/server/dist/index.js",
    url: `${baseURL}/api/health/live`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 12_000 },
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl(),
      HOST: "127.0.0.1",
      PORT: String(port),
      API_RATE_LIMIT: "1000",
      TRUST_PROXY: "",
    },
  },
});
