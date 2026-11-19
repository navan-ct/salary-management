import { pino } from "pino";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../apps/server/src/app.js";
import { createDatabase } from "../../apps/server/src/db/client.js";
import { testAuthSecret } from "../../tooling/test-auth.js";
import { testDatabaseUrl } from "../../tooling/test-database.js";
import { withTestAccount } from "../helpers/auth-account.js";
import { seedEmployeeRecords } from "../helpers/employee-records.js";
import migrateTestDatabase from "../helpers/migrate-test-database.js";

const { db, pool } = createDatabase(testDatabaseUrl());
const app = createApp({
  db,
  logger: pino({ level: "silent" }),
  authSettings: { secret: testAuthSecret, baseURL: "http://127.0.0.1" },
});
const directory = "/api/employees";
let records: Awaited<ReturnType<typeof seedEmployeeRecords>>;
let cleanUpRecords: (() => Promise<void>) | undefined;

beforeAll(async () => {
  await migrateTestDatabase();
  records = await seedEmployeeRecords(db);
  cleanUpRecords = () => records.cleanUp();
});

afterAll(async () => {
  try {
    await cleanUpRecords?.();
  } finally {
    await pool.end();
  }
});

async function asHr(run: (api: ReturnType<typeof request.agent>) => Promise<void>) {
  await withTestAccount(async ({ email, password }) => {
    const api = request.agent(app);
    await api.post("/api/auth/sign-in/email").send({ email, password }).expect(200);
    await run(api);
  });
}

function employeeIds(rows: readonly { employeeId: string }[]) {
  return rows.map(({ employeeId }) => ({ employeeId }));
}

function recordSummary() {
  const { employeeId, fullName, countryCode, departmentId, annualBaseSalary, salaryCurrencyCode } = records.record;
  return {
    employeeId, fullName, countryCode, countryName: "India", departmentId, departmentName: "Engineering",
    annualBaseSalary, salaryCurrencyCode,
  };
}

describe("Employee directory API", () => {
  it("opens the first page of the unfiltered directory when no parameters are supplied", async () => {
    await asHr(async (api) => {
      const response = await api.get(directory).expect(200).expect("Cache-Control", "no-store");

      expect(response.body).toMatchObject({ page: 1 });
      expect(response.body).toHaveProperty("employees.length", 50);
    });
  });

  it("orders by name and employee ID across the 50-employee page boundary", async () => {
    const { groupName, firstPage, sameName, record, inCanada, inFinance } = records;
    await asHr(async (api) => {
      const first = await api.get(directory).query({ search: groupName }).expect(200);
      const second = await api.get(directory).query({ search: groupName, page: 2 }).expect(200);

      expect(first.body).toMatchObject({ page: 1, total: 54 });
      expect(first.body).toMatchObject({ employees: employeeIds(firstPage) });
      expect(second.body).toMatchObject({ page: 2, total: 54, employees: employeeIds([sameName, record, inCanada, inFinance]) });
    });
  });

  it("matches a full employee ID and returns the current salary and directory fields", async () => {
    await asHr(async (api) => {
      const response = await api.get(directory).query({ search: records.record.employeeId }).expect(200);

      expect(response.body).toMatchObject({ page: 1, total: 1, employees: [recordSummary()] });
    });
  });

  it("does not match a partial employee ID", async () => {
    await asHr(async (api) => {
      const response = await api.get(directory).query({ search: records.record.employeeId.slice(0, -1) }).expect(200);

      expect(response.body).toMatchObject({ page: 1, total: 0, employees: [] });
    });
  });

  it("matches a full name and a name substring regardless of case", async () => {
    await asHr(async (api) => {
      const fullName = await api.get(directory).query({ search: records.record.fullName.toUpperCase() }).expect(200);
      const substring = await api.get(directory).query({ search: `${records.token.slice(-8)} dAn` }).expect(200);

      expect(fullName.body).toMatchObject({ total: 1, employees: [recordSummary()] });
      expect(substring.body).toMatchObject({ total: 1, employees: [recordSummary()] });
    });
  });

  it("applies either filter or both filters to the name search before paginating", async () => {
    const { groupName: search, engineering, finance, sameName, record, inCanada, inFinance } = records;
    await asHr(async (api) => {
      const countryOnly = await api.get(directory).query({ search, page: 2, countryCode: "IN" }).expect(200);
      const departmentOnly = await api.get(directory).query({ search, page: 2, departmentId: engineering.id }).expect(200);
      const both = await api.get(directory).query({ search, page: 2, countryCode: "IN", departmentId: engineering.id }).expect(200);
      const empty = await api.get(directory).query({ search, countryCode: "CA", departmentId: finance.id }).expect(200);

      expect(countryOnly.body).toMatchObject({ page: 2, total: 53, employees: employeeIds([sameName, record, inFinance]) });
      expect(departmentOnly.body).toMatchObject({ page: 2, total: 53, employees: employeeIds([sameName, record, inCanada]) });
      expect(both.body).toMatchObject({ page: 2, total: 52, employees: employeeIds([sameName, record]) });
      expect(empty.body).toMatchObject({ page: 1, total: 0, employees: [] });
    });
  });
});

describe("Employee record API", () => {
  it("returns the requested employee's profile and exact current annual base salary", async () => {
    await asHr(async (api) => {
      const response = await api.get(`${directory}/${records.record.employeeId}`).expect(200).expect("Cache-Control", "no-store");

      expect(response.body).toMatchObject({ employee: recordSummary() });
    });
  });

  it("returns that employee's salary history newest first with both amounts, currencies and audit details", async () => {
    const { record, newerChange, olderChange } = records;
    await asHr(async (api) => {
      const response = await api.get(`${directory}/${record.employeeId}/salary-history`).expect(200).expect("Cache-Control", "no-store");

      expect(response.body).toMatchObject({
        history: [newerChange, olderChange].map((change) => ({
          previousAmount: change.previousAmount, previousCurrencyCode: change.previousCurrencyCode,
          newAmount: change.newAmount, newCurrencyCode: change.newCurrencyCode,
          reason: change.reason, editorName: change.editorName, savedAt: change.savedAt.toISOString(),
        })),
      });
    });
  });

  it("returns empty history for an existing employee with no salary changes", async () => {
    await asHr(async (api) => {
      const response = await api.get(`${directory}/${records.inCanada.employeeId}/salary-history`).expect(200);

      expect(response.body).toMatchObject({ history: [] });
    });
  });

  it("returns not found for both the profile and history of an unknown employee", async () => {
    await asHr(async (api) => {
      const path = `${directory}/${records.missingEmployeeId}`;
      await api.get(path).expect(404).expect({ error: { code: "NOT_FOUND", message: "Resource not found." } });
      await api.get(`${path}/salary-history`).expect(404).expect({ error: { code: "NOT_FOUND", message: "Resource not found." } });
    });
  });
});
