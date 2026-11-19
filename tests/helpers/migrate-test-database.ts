import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDatabase } from "../../apps/server/src/db/client.js";
import { testDatabaseUrl } from "../../tooling/test-database.js";

const migrationsFolder = fileURLToPath(new URL("../../apps/server/drizzle/", import.meta.url));

export default async function migrateTestDatabase(): Promise<void> {
  const { db, pool } = createDatabase(testDatabaseUrl());

  try {
    const lock = await pool.connect();
    try {
      await lock.query("select pg_advisory_lock(82750319)");
      await migrate(db, { migrationsFolder });
    } finally {
      lock.release(true);
    }
  } finally {
    await pool.end();
  }
}
