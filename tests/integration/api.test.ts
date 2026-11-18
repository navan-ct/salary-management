import { sql } from "drizzle-orm";
import { integer, pgTable } from "drizzle-orm/pg-core";
import { pino } from "pino";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import { createApp } from "../../apps/server/src/app.js";
import { createDatabase } from "../../apps/server/src/db/client.js";
import { testDatabaseUrl } from "../../tooling/test-database.js";

const databaseUrl = testDatabaseUrl();
const { db, pool } = createDatabase(databaseUrl);
const logger = pino({ level: "silent" });
const api = request(createApp({ db, logger, production: true }));

afterAll(async () => {
  await pool.end();
});

describe("Express API", () => {
  it("reports liveness and applies request IDs, cache policy and security headers", async () => {
    await api.get("/api/health/live")
      .expect(200, { status: "ok" })
      .expect("Cache-Control", "no-store")
      .expect("X-Request-Id", /^[\da-f-]{36}$/u)
      .expect("Content-Security-Policy", /default-src 'self'/u)
      .expect("Strict-Transport-Security", /max-age=/u)
      .expect("X-Content-Type-Options", "nosniff")
      .expect((res) => {
        expect(res.headers["x-powered-by"]).toBeUndefined();
      });
  });

  it("reports readiness through the real PostgreSQL connection", async () => {
    await api.get("/api/health/ready").expect(200, { status: "ready" });
  });

  it("returns a sanitized readiness failure when the database pool is unavailable", async () => {
    const unavailable = createDatabase(databaseUrl);
    await unavailable.pool.end();

    await request(createApp({ db: unavailable.db, logger })).get("/api/health/ready")
      .expect(503, { error: { code: "SERVICE_UNAVAILABLE", message: "Service is unavailable." } });
  });

  it("returns JSON for an unknown API path even when the caller accepts HTML", async () => {
    await api.get("/api/missing").set("Accept", "text/html")
      .expect("Content-Type", /json/u)
      .expect(404, { error: { code: "NOT_FOUND", message: "Resource not found." } });
  });

  it("rejects malformed JSON and oversized bodies", async () => {
    await api.post("/api/example").type("json").send("{")
      .expect(400, { error: { code: "BAD_REQUEST", message: "Invalid request." } });

    await api.post("/api/example").send({ data: "a".repeat(65_536) })
      .expect(413, { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." } });
  });

  it("rate limits repeated requests and reports the retry window", async () => {
    const limitedApi = request(createApp({ db, logger, apiRateLimit: 2 }));
    await limitedApi.get("/api/health/live").expect(200);
    await limitedApi.get("/api/health/live").expect(200);
    await limitedApi.get("/api/health/live")
      .expect("RateLimit", /r=0/u)
      .expect("Retry-After", /^\d+$/u)
      .expect(429, { error: { code: "RATE_LIMITED", message: "Too many requests." } });
  });
});

describe("Drizzle PostgreSQL adapter", () => {
  it("writes and reads typed data inside a real transaction", async () => {
    const probe = pgTable("scaffold_probe", { value: integer().notNull() });

    await db.transaction(async (transaction) => {
      await transaction.execute(sql`create temporary table scaffold_probe (value integer not null) on commit drop`);
      await transaction.insert(probe).values({ value: 42 });
      await expect(transaction.select().from(probe)).resolves.toEqual([{ value: 42 }]);
    });
  });
});
