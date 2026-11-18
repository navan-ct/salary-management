import { defineConfig } from "vitest/config";

import { loadWorkspaceEnv } from "./tooling/load-env.js";

loadWorkspaceEnv();

export default defineConfig({
  test: {
    include: [
      "apps/*/src/**/*.test.{ts,tsx}",
      "tests/{architecture,integration,unit}/**/*.test.ts",
    ],
  },
});
