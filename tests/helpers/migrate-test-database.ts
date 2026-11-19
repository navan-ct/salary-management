import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDatabase } from "../../apps/server/src/db/client.js";
import { testDatabaseUrl } from "../../tooling/test-database.js";

const migrationsFolder = fileURLToPath(new URL("../../apps/server/drizzle/", import.meta.url));

export default async function migrateTestDatabase(): Promise<void> {
  const { db, pool } = createDatabase(testDatabaseUrl());

  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}
