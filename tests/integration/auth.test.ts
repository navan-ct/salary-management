import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";

import { pino } from "pino";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../apps/server/src/app.js";
import { createDatabase } from "../../apps/server/src/db/client.js";
import { testAuthSecret } from "../../tooling/test-auth.js";
import { testDatabaseUrl } from "../../tooling/test-database.js";
import { expireAuthSessions, fixturePassword, withTestAccount } from "../helpers/auth-account.js";
import migrateTestDatabase from "../helpers/migrate-test-database.js";

const { db, pool } = createDatabase(testDatabaseUrl());
const server = createServer();
const api = request(server);

const auth = "/api/auth";
const directory = "/api/employees";
const employee = `${directory}/AC-00001`;
const protectedEndpoints = [
  ["get", directory],
  ["get", employee],
  ["get", `${employee}/salary-history`],
  ["patch", `${employee}/salary`],
  ["get", "/api/insights/countries"],
  ["get", "/api/insights/countries/IN/departments"],
] as const;

beforeAll(async () => {
  await migrateTestDatabase();
  await once(server.listen(0, "127.0.0.1"), "listening");
  const address = server.address();
  assert.ok(address !== null && typeof address === "object");
  server.on("request", createApp({
    db,
    logger: pino({ level: "silent" }),
    authSettings: { secret: testAuthSecret, baseURL: `http://127.0.0.1:${String(address.port)}` },
  }));
});

afterAll(async () => {
  try {
    await server[Symbol.asyncDispose]();
  } finally {
    await pool.end();
  }
});

function signInRequest(email: string, password: string) {
  return api.post(`${auth}/sign-in/email`).send({ email, password });
}

async function signIn(email: string, password: string): Promise<string> {
  const response = await signInRequest(email, password).expect(200).expect("Cache-Control", "no-store");
  const cookies = response.headers["set-cookie"] as string[] | undefined;

  assert.ok(cookies?.length, "Sign-in did not set a session cookie");
  expect(cookies).toEqual(expect.arrayContaining([expect.stringMatching(/;\s*HttpOnly\b/iu)]));

  return cookies.map((cookie) => cookie.replace(/;.*$/u, "")).join("; ");
}

function getSession(cookie: string) {
  return api.get(`${auth}/get-session`).set("Cookie", cookie).expect("Cache-Control", "no-store");
}

function protectedRequest(method: "get" | "patch", path: string) {
  if (method === "get") {
    return api.get(path);
  }

  const salaryChange = api.patch(path);
  return salaryChange.set("Origin", new URL(salaryChange.url).origin).send({});
}

describe("Email and password authentication", () => {
  it("rejects an unprovisioned work email without issuing a session cookie", async () => {
    const response = await signInRequest(`unprovisioned-${randomUUID()}@acme.com`, fixturePassword).expect(401);

    expect(response.body).toMatchObject({ code: "INVALID_EMAIL_OR_PASSWORD" });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects the wrong password with the same error used for unknown email addresses", async () => {
    await withTestAccount(async ({ email }) => {
      const wrongPassword = await signInRequest(email, "incorrect-password").expect(401);
      const unknownEmail = await signInRequest(`unknown-${randomUUID()}@acme.com`, "incorrect-password").expect(401);

      expect(wrongPassword.body).toEqual(unknownEmail.body);
      expect(wrongPassword.headers["set-cookie"]).toBeUndefined();
    });
  });

  it("has no sign-up endpoint", async () => {
    const response = await api.post(`${auth}/sign-up/email`).send({
      email: `unprovisioned-${randomUUID()}@acme.com`,
      name: "Unprovisioned Account",
      password: fixturePassword,
    }).expect(404);

    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("creates a session and invalidates it on sign-out even if the original cookie is reused", async () => {
    await withTestAccount(async ({ id, email, password }) => {
      const cookie = await signIn(email, password);
      const activeSession = await getSession(cookie).expect(200);
      expect(activeSession.body).toMatchObject({ user: { id, email }, session: { userId: id } });

      const signOut = api.post(`${auth}/sign-out`);
      await signOut.set("Origin", new URL(signOut.url).origin).set("Cookie", cookie).expect(200);

      await getSession(cookie).expect(200, "null");
      await api.get(directory).set("Cookie", cookie).expect(401);
    });
  });
});

describe("Authorization for employee and salary data", () => {
  it.each(protectedEndpoints)("requires a valid session for %s %s", async (method, path) => {
    await protectedRequest(method, path)
      .expect(401)
      .expect("Content-Type", /json/u)
      .expect("Cache-Control", "no-store");
  });

  it("allows a signed-in user to read the directory", async () => {
    await withTestAccount(async ({ email, password }) => {
      const cookie = await signIn(email, password);
      await api.get(directory).set("Cookie", cookie)
        .expect(200).expect("Content-Type", /json/u).expect("Cache-Control", "no-store");
    });
  });

  it("rejects an expired session while the client still has its cookie", async () => {
    await withTestAccount(async ({ id, email, password }, fixtureDb) => {
      const cookie = await signIn(email, password);
      expect(await expireAuthSessions(fixtureDb, id)).toBe(1);

      await api.get(directory).set("Cookie", cookie).expect(401);
      await getSession(cookie).expect(200, "null");
    });
  });
});
