import { desc, eq, sql } from "drizzle-orm";
import { pino } from "pino";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../apps/server/src/app.js";
import { createDatabase } from "../../apps/server/src/db/client.js";
import { employee, salaryChange } from "../../apps/server/src/db/schema/index.js";
import { testAuthSecret } from "../../tooling/test-auth.js";
import { testDatabaseUrl } from "../../tooling/test-database.js";
import { expireAuthSessions, withTestAccount } from "../helpers/auth-account.js";
import { seedEmployeeRecords } from "../helpers/employee-records.js";
import migrateTestDatabase from "../helpers/migrate-test-database.js";

const { db, pool } = createDatabase(testDatabaseUrl());
const logs: string[] = [];
const app = createApp({
  db,
  logger: pino({}, { write: (log: string) => {
    logs.push(log);
  } }),
  authSettings: { secret: testAuthSecret, baseURL: "http://127.0.0.1" },
});
const directory = "/api/employees";
const reason = "Compensation review for a new role";

type Records = Awaited<ReturnType<typeof seedEmployeeRecords>>;
interface Manager { api: ReturnType<typeof request.agent>; id: string; name: string }

beforeAll(migrateTestDatabase);

afterAll(async () => {
  await pool.end();
});

async function asHr(run: (manager: Manager) => Promise<void>, name?: string) {
  await withTestAccount(async ({ id, email, password, name: editorName }) => {
    const api = request.agent(app);
    await api.post("/api/auth/sign-in/email").send({ email, password }).expect(200);
    await run({ api, id, name: editorName });
  }, name);
}

async function withRecords(run: (records: Records) => Promise<void>) {
  const records = await seedEmployeeRecords(db);
  try {
    await run(records);
  } finally {
    await records.cleanUp();
  }
}

async function withSalaryEditor(run: (manager: Manager, records: Records) => Promise<void>) {
  await asHr(async (manager) => withRecords(async (records) => run(manager, records)));
}

function editSalary(api: Manager["api"], employeeId: string, draft: Record<string, unknown>) {
  const update = api.patch(`${directory}/${employeeId}/salary`);
  return update.set("Origin", new URL(update.url).origin).send(draft);
}

function salaryDraft(record: Records["record"]) {
  return {
    annualBaseSalary: "128000.25",
    salaryCurrencyCode: record.salaryCurrencyCode,
    salaryVersion: record.salaryVersion,
    reason,
  };
}

async function readSalary(employeeId: string) {
  const [current] = await db.select({
    annualBaseSalary: employee.annualBaseSalary,
    salaryCurrencyCode: employee.salaryCurrencyCode,
    salaryVersion: employee.salaryVersion,
  }).from(employee).where(eq(employee.employeeId, employeeId));
  const history = await db.select().from(salaryChange).where(eq(salaryChange.employeeId, employeeId))
    .orderBy(desc(salaryChange.salaryVersion));
  return { current, history };
}

describe("Changing an employee salary", () => {
  it("reads the salary version alongside the current salary before editing", async () => {
    await withSalaryEditor(async ({ api }, { record }) => {
      const response = await api.get(`${directory}/${record.employeeId}`).expect(200);

      expect(response.body).toMatchObject({ employee: {
        annualBaseSalary: record.annualBaseSalary, salaryCurrencyCode: record.salaryCurrencyCode, salaryVersion: record.salaryVersion,
      } });
    });
  });

  it.each([
    { changed: "amount only", annualBaseSalary: "9007199254740993.01", salaryCurrencyCode: "USD" },
    { changed: "currency only", annualBaseSalary: "124500.75", salaryCurrencyCode: "CAD" },
    { changed: "amount and currency", annualBaseSalary: "18000001", salaryCurrencyCode: "JPY" },
  ])("saves a change to $changed exactly, with one history entry for the signed-in manager", async ({ annualBaseSalary, salaryCurrencyCode }) => {
    await withSalaryEditor(async ({ api, id, name }, { record, newerChange, olderChange }) => {
      const { employeeId } = record;
      const draft = { ...salaryDraft(record), annualBaseSalary, salaryCurrencyCode };
      const salaryVersion = record.salaryVersion + 1;
      const startedAt = Date.now();
      await editSalary(api, employeeId, draft).expect(200).expect("Cache-Control", "no-store");
      const finishedAt = Date.now();

      const current = { annualBaseSalary, salaryCurrencyCode, salaryVersion };
      const newChange = {
        salaryVersion, previousAmount: record.annualBaseSalary, previousCurrencyCode: record.salaryCurrencyCode,
        newAmount: annualBaseSalary, newCurrencyCode: salaryCurrencyCode, reason, editorName: name,
      };
      const saved = await readSalary(employeeId);
      expect(saved.current).toEqual(current);
      expect(saved.history).toMatchObject([{ ...newChange, employeeId, editorUserId: id }, newerChange, olderChange]);
      const savedAt = saved.history[0]?.savedAt.getTime() ?? 0;
      expect(savedAt).toBeGreaterThanOrEqual(startedAt);
      expect(savedAt).toBeLessThanOrEqual(finishedAt);

      const profile = await api.get(`${directory}/${employeeId}`).expect(200);
      expect(profile.body).toMatchObject({ employee: current });
      const history = await api.get(`${directory}/${employeeId}/salary-history`).expect(200);
      expect(history.body).toMatchObject({ history: [
        { ...newChange, savedAt: new Date(savedAt).toISOString() },
        { salaryVersion: newerChange.salaryVersion },
        { salaryVersion: olderChange.salaryVersion },
      ] });
      const listing = await api.get(directory).query({ search: employeeId }).expect(200);
      expect(listing.body).toMatchObject({ employees: [{ employeeId, annualBaseSalary, salaryCurrencyCode }] });

      expect(logs.join("")).not.toContain(annualBaseSalary);
      expect(logs.join("")).not.toContain(reason);
    });
  });

  it.each([
    { case: "missing amount after a currency switch", input: { annualBaseSalary: undefined, salaryCurrencyCode: "CAD" }, field: "annualBaseSalary" },
    { case: "malformed decimal", input: { annualBaseSalary: "12.34.56" }, field: "annualBaseSalary" },
    { case: "numeric JSON amount", input: { annualBaseSalary: 12.34 }, field: "annualBaseSalary" },
    { case: "zero amount", input: { annualBaseSalary: "0.00" }, field: "annualBaseSalary" },
    { case: "negative amount", input: { annualBaseSalary: "-12.34" }, field: "annualBaseSalary" },
    { case: "too many decimal places for USD", input: { annualBaseSalary: "12.345" }, field: "annualBaseSalary" },
    { case: "a fractional JPY amount", input: { annualBaseSalary: "12.50", salaryCurrencyCode: "JPY" }, field: "annualBaseSalary" },
    { case: "unsupported currency", input: { salaryCurrencyCode: "ZZZ" }, field: "salaryCurrencyCode" },
    { case: "missing reason", input: { reason: undefined }, field: "reason" },
    { case: "whitespace-only reason", input: { reason: " \t\n\u00a0\u0085\u3000" }, field: "reason" },
    { case: "missing version", input: { salaryVersion: undefined }, field: "salaryVersion" },
  ])("rejects $case with field feedback and leaves salary and history untouched", async ({ input, field }) => {
    await withSalaryEditor(async ({ api }, { record }) => {
      const before = await readSalary(record.employeeId);
      const response = await editSalary(api, record.employeeId, { ...salaryDraft(record), ...input }).expect(400);

      expect(response.body).toHaveProperty(["error", "fields", field], expect.stringMatching(/\S/u));
      expect(await readSalary(record.employeeId)).toEqual(before);
    });
  });

  it("rejects a numerically identical salary in the same currency even with different formatting", async () => {
    await withSalaryEditor(async ({ api }, { record }) => {
      const before = await readSalary(record.employeeId);
      const response = await editSalary(api, record.employeeId, {
        ...salaryDraft(record), annualBaseSalary: `0${record.annualBaseSalary}`,
      }).expect(400);

      expect(response.body).toHaveProperty("error.code", "SALARY_UNCHANGED");
      expect(await readSalary(record.employeeId)).toEqual(before);
    });
  });

  it("creates the first history entry for a salary at version zero", async () => {
    await withSalaryEditor(async ({ api, id }, { inCanada }) => {
      const draft = salaryDraft(inCanada);
      await editSalary(api, inCanada.employeeId, draft).expect(200);

      const saved = await readSalary(inCanada.employeeId);
      expect(saved.current).toEqual({ annualBaseSalary: draft.annualBaseSalary, salaryCurrencyCode: "CAD", salaryVersion: 1 });
      expect(saved.history).toMatchObject([{
        salaryVersion: 1, previousAmount: inCanada.annualBaseSalary, previousCurrencyCode: "CAD",
        newAmount: draft.annualBaseSalary, newCurrencyCode: "CAD", reason, editorUserId: id,
      }]);
    });
  });

  it("returns not found for an unknown employee", async () => {
    await withSalaryEditor(async ({ api }, { missingEmployeeId, record }) => {
      await editSalary(api, missingEmployeeId, salaryDraft(record)).expect(404);
    });
  });

  it("rejects an expired session without changing the current salary or history", async () => {
    await withSalaryEditor(async ({ api, id }, { record }) => {
      const before = await readSalary(record.employeeId);
      expect(await expireAuthSessions(db, id)).toBe(1);

      await editSalary(api, record.employeeId, salaryDraft(record)).expect(401).expect("Cache-Control", "no-store");
      expect(await readSalary(record.employeeId)).toEqual(before);
    });
  });

  it("commits exactly one of two concurrent changes submitted by different managers for the same salary version", async () => {
    await asHr(async (first) => asHr(async (second) => withRecords(async ({ record, newerChange, olderChange }) => {
      const { employeeId } = record;
      const submissions = [
        { manager: first, draft: { ...salaryDraft(record), annualBaseSalary: "130000.01", reason: "First manager’s review" } },
        { manager: second, draft: { ...salaryDraft(record), annualBaseSalary: "132000.02", reason: "Second manager’s review" } },
      ];
      const results = await Promise.all(submissions.map(async (submission) => ({
        ...submission, response: await editSalary(submission.manager.api, employeeId, submission.draft),
      })));
      const [winner, stale] = results.toSorted((a, b) => a.response.status - b.response.status);
      expect(winner?.response.status).toBe(200);
      expect(stale?.response.status).toBe(409);
      expect(stale?.response.body).toHaveProperty("error.code", "SALARY_VERSION_CONFLICT");

      const saved = await readSalary(employeeId);
      expect(saved.current).toMatchObject({
        annualBaseSalary: winner?.draft.annualBaseSalary, salaryVersion: record.salaryVersion + 1,
      });
      expect(saved.history).toMatchObject([{
        salaryVersion: record.salaryVersion + 1,
        previousAmount: record.annualBaseSalary, newAmount: winner?.draft.annualBaseSalary, reason: winner?.draft.reason,
        editorUserId: winner?.manager.id, editorName: winner?.manager.name,
      }, newerChange, olderChange]);
    }), "Second HR Manager"), "First HR Manager");
  });

  it.each([
    {
      write: "current salary update", table: employee, constraint: "test_reject_salary_update",
      condition: sql`annual_base_salary <> 999999998.27`,
    },
    {
      write: "history insert", table: salaryChange, constraint: "test_reject_salary_history",
      condition: sql`reason <> 'Reserved rollback test reason'`,
    },
  ])("rolls back both writes when PostgreSQL rejects the $write", async ({ table, constraint, condition }) => {
    await withSalaryEditor(async ({ api }, { record }) => {
      const before = await readSalary(record.employeeId);
      const attemptedAmount = "999999998.27";
      const attemptedReason = "Reserved rollback test reason";
      const name = sql.identifier(constraint);
      await db.execute(sql`alter table ${table} add constraint ${name} check (${condition}) not valid`);
      try {
        const response = await editSalary(api, record.employeeId, {
          ...salaryDraft(record), annualBaseSalary: attemptedAmount, reason: attemptedReason,
        }).expect(500);

        expect(response.body).toHaveProperty("error.code", "SALARY_SAVE_FAILED");
        expect(await readSalary(record.employeeId)).toEqual(before);
        expect(logs.join("")).not.toContain(attemptedAmount);
        expect(logs.join("")).not.toContain(attemptedReason);
      } finally {
        await db.execute(sql`alter table ${table} drop constraint ${name}`);
      }
    });
  });
});
