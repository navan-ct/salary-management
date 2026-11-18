import { env } from "node:process";

import { databaseUrlSchema } from "../apps/server/src/config/env.js";

export function testDatabaseUrl(): string {
  const result = databaseUrlSchema.safeParse(env.TEST_DATABASE_URL);

  if (!result.success) {
    throw new Error("Set TEST_DATABASE_URL to a PostgreSQL connection URL for the test database.");
  }

  return result.data;
}
