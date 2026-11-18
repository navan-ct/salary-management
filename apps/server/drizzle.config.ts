import { defineConfig } from "drizzle-kit";
import { env } from "node:process";

import { loadWorkspaceEnv } from "../../tooling/load-env.js";
import { databaseUrlSchema } from "./src/config/env.js";

loadWorkspaceEnv();

const databaseUrl = env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  breakpoints: false,
  ...(databaseUrl === undefined ? {} : { dbCredentials: { url: databaseUrlSchema.parse(databaseUrl) } }),
});
