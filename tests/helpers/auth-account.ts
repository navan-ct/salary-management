import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";

import { type Database, createDatabase } from "../../apps/server/src/db/client.js";
import { testDatabaseUrl } from "../../tooling/test-database.js";

export const fixturePassword = "Salary-auth-fixture-2026!";
const betterAuthFixturePasswordHash = "f006c032f59fe43e309ebafb2bc838ff:12628c6754890b4134a4a1e1a3bcaf5093769c3c9baab514cf429659b30e4686175d3de0a8743bfa93f0cffcbaa9e8b2445c186044423c4cfd165248df01e0fe";

interface TestAccount {
  id: string;
  email: string;
  name: string;
  password: string;
}

export async function withTestAccount(
  run: (account: TestAccount, db: Database) => Promise<void>,
  name = "Test Account",
): Promise<void> {
  const id = randomUUID();
  const email = `auth-test-${id}@acme.com`;
  const { db, pool } = createDatabase(testDatabaseUrl());

  try {
    await db.transaction(async (transaction) => {
      await transaction.execute(sql`
        insert into "user" (id, email, name, email_verified, created_at, updated_at)
        values (${id}, ${email}, ${name}, true, now(), now())
      `);
      await transaction.execute(sql`
        insert into account (id, account_id, user_id, provider_id, password, created_at, updated_at)
        values (${randomUUID()}, ${id}, ${id}, 'credential', ${betterAuthFixturePasswordHash}, now(), now())
      `);
    });

    try {
      await run({ id, email, name, password: fixturePassword }, db);
    } finally {
      await db.execute(sql`delete from "user" where id = ${id}`);
    }
  } finally {
    await pool.end();
  }
}

export async function expireAuthSessions(db: Database, userId: string): Promise<number | null> {
  const result = await db.execute(sql`
    update session set expires_at = now() - interval '1 day' where user_id = ${userId}
  `);

  return result.rowCount;
}
