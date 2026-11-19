import { randomUUID } from "node:crypto";
import process from "node:process";

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { databaseUrlSchema } from "../../config/env.js";
import { createDatabase } from "../client.js";
import { account, session, user } from "../schema/index.js";

const seedEnv = z.object({
  DATABASE_URL: databaseUrlSchema,
  DEFAULT_ACCOUNT_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  DEFAULT_ACCOUNT_PASSWORD: z.string().min(8).max(128),
});

async function main() {
  const input = seedEnv.safeParse(process.env);
  if (!input.success) {
    const keys = input.error.issues.map(({ path }) => path.join("."));
    process.stderr.write(`Invalid or missing account seed settings (${keys.join(", ")}).\n`);
    process.exitCode = 1;
    return;
  }

  const { DATABASE_URL: databaseUrl, DEFAULT_ACCOUNT_EMAIL: email, DEFAULT_ACCOUNT_PASSWORD: password } = input.data;
  const { db, pool } = createDatabase(databaseUrl);

  try {
    const result = await db.transaction(async (transaction) => {
      await transaction.execute(sql`lock table ${user} in share row exclusive mode`);
      const [existing, additional] = await transaction.select({
        id: user.id,
        email: user.email,
        credentialId: account.id,
        passwordHash: account.password,
      }).from(user).leftJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "credential"))).limit(2);

      if (additional !== undefined || (existing !== undefined && existing.email !== email)) {
        return "conflict";
      }

      if (existing?.passwordHash && await verifyPassword({ hash: existing.passwordHash, password })) {
        return "present";
      }

      const passwordHash = await hashPassword(password);
      if (existing !== undefined && existing.credentialId !== null) {
        await transaction.update(account).set({ password: passwordHash, updatedAt: new Date() })
          .where(eq(account.id, existing.credentialId));
        await transaction.delete(session).where(eq(session.userId, existing.id));
        return "updated";
      }

      const id = existing?.id ?? randomUUID();
      if (existing === undefined) {
        await transaction.insert(user).values({ id, email, name: "HR Manager", emailVerified: true });
      }
      await transaction.insert(account).values({
        id: randomUUID(), accountId: id, userId: id, providerId: "credential", password: passwordHash,
      });
      return "created";
    });

    switch (result) {
      case "created":
        process.stdout.write("Default account seeded.\n");
        break;
      case "present":
        process.stdout.write("Default account is up to date.\n");
        break;
      case "updated":
        process.stdout.write("Default account password updated. Existing sessions were ended.\n");
        break;
      case "conflict":
        process.stderr.write("Cannot seed the default account because the database contains a different or additional account.\n");
        process.exitCode = 1;
        break;
    }
  } finally {
    await pool.end();
  }
}

try {
  await main();
} catch {
  process.stderr.write("Could not seed the default account. Check the database connection and migrations.\n");
  process.exitCode = 1;
}
