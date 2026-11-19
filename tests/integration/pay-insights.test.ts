import { sql } from "drizzle-orm";
import { pino } from "pino";
import request, { type Response } from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../apps/server/src/app.js";
import { createDatabase } from "../../apps/server/src/db/client.js";
import { employee } from "../../apps/server/src/db/schema/index.js";
import { testAuthSecret } from "../../tooling/test-auth.js";
import { testDatabaseUrl } from "../../tooling/test-database.js";
import { withTestAccount } from "../helpers/auth-account.js";
import migrateTestDatabase from "../helpers/migrate-test-database.js";
import { seedPayInsightsRecords } from "../helpers/pay-insights-records.js";

const { db, pool } = createDatabase(testDatabaseUrl());
const app = createApp({
  db,
  logger: pino({ level: "silent" }),
  authSettings: { secret: testAuthSecret, baseURL: "http://127.0.0.1" },
});
const countriesPath = "/api/insights/countries";
const departmentsPath = (countryCode: string) => `${countriesPath}/${countryCode}/departments`;

type Records = Awaited<ReturnType<typeof seedPayInsightsRecords>>;
type Country = Records["mainCountry"];
type Department = Records["engineering"];
interface SalaryGroup {
  salaryCurrencyCode: string;
  salaryMinorUnits: number;
  headcount: number;
  medianAnnualBaseSalary: string;
}
interface CountryRow extends SalaryGroup { countryCode: string; countryName: string }
interface DepartmentRow extends SalaryGroup { departmentId: number; departmentName: string }
interface CountryReport { countries: Country[]; rows: CountryRow[] }
interface DepartmentReport { country: Country; rows: DepartmentRow[] }

beforeAll(migrateTestDatabase);
afterAll(async () => pool.end());

async function asHr(run: (api: ReturnType<typeof request.agent>, records: Records) => Promise<void>) {
  await withTestAccount(async ({ email, password }) => {
    const records = await seedPayInsightsRecords(db);
    try {
      const api = request.agent(app);
      await api.post("/api/auth/sign-in/email").send({ email, password }).expect(200);
      await run(api, records);
    } finally {
      await records.cleanUp();
    }
  });
}

function salaryGroup(
  [salaryCurrencyCode, salaryMinorUnits]: readonly [string, number], headcount: number, medianAnnualBaseSalary: string,
): SalaryGroup {
  return { salaryCurrencyCode, salaryMinorUnits, headcount, medianAnnualBaseSalary };
}

const inr = ["INR", 2] as const;
const usd = ["USD", 2] as const;
const jpy = ["JPY", 0] as const;

function countryRow({ code, name }: Country, group: SalaryGroup): CountryRow {
  return { countryCode: code, countryName: name, ...group };
}

function departmentRow({ id, name }: Department, group: SalaryGroup): DepartmentRow {
  return { departmentId: id, departmentName: name, ...group };
}

function countryRows(response: Response, ...countries: Country[]) {
  const { rows } = response.body as CountryReport;
  return rows.filter(({ countryCode }) => countries.some(({ code }) => countryCode === code));
}

function expectRows(actual: readonly SalaryGroup[], expected: readonly SalaryGroup[]) {
  expect(actual).toHaveLength(expected.length);
  expect(actual).toEqual(expect.arrayContaining([...expected]));
}

describe("Pay insights API", () => {
  it("reports separate currency groups across countries and makes empty countries available for selection", async () => {
    await asHr(async (api, { mainCountry, otherCountry, emptyCountry }) => {
      const response = await api.get(countriesPath).expect(200).expect("Cache-Control", "no-store");

      expect((response.body as CountryReport).countries).toEqual(expect.arrayContaining([mainCountry, otherCountry, emptyCountry]));
      expectRows(countryRows(response, mainCountry, otherCountry, emptyCountry), [
        countryRow(mainCountry, salaryGroup(inr, 4, "65000.50")),
        countryRow(mainCountry, salaryGroup(usd, 1, "43000.00")),
        countryRow(mainCountry, salaryGroup(jpy, 1, "900000")),
        countryRow(otherCountry, salaryGroup(inr, 1, "240000.00")),
      ]);
    });
  });

  it("uses the numerically ordered middle salary for an odd group and scopes department results to the selected country", async () => {
    await asHr(async (api, { mainCountry, engineering, finance }) => {
      const response = await api.get(departmentsPath(mainCountry.code)).expect(200).expect("Cache-Control", "no-store");
      const report = response.body as DepartmentReport;

      expect(report.country).toEqual(mainCountry);
      expectRows(report.rows, [
        departmentRow(engineering, salaryGroup(inr, 3, "60000.75")),
        departmentRow(engineering, salaryGroup(usd, 1, "43000.00")),
        departmentRow(finance, salaryGroup(inr, 1, "70000.25")),
        departmentRow(finance, salaryGroup(jpy, 1, "900000")),
      ]);
    });
  });

  it("returns an empty report for a country with no employee records", async () => {
    await asHr(async (api, { emptyCountry }) => {
      const response = await api.get(departmentsPath(emptyCountry.code)).expect(200);

      expect(response.body).toMatchObject({ country: emptyCountry, rows: [] });
    });
  });

  it("moves a saved salary between currencies in both reports and preserves an exact half-cent median", async () => {
    await asHr(async (api, { mainCountry, engineering, finance, movingEmployee }) => {
      const initialOverview = await api.get(countriesPath).expect(200);
      const initialDepartments = await api.get(departmentsPath(mainCountry.code)).expect(200);
      expect(countryRows(initialOverview, mainCountry)).toContainEqual(countryRow(mainCountry, salaryGroup(inr, 4, "65000.50")));
      expect((initialDepartments.body as DepartmentReport).rows).toContainEqual(
        departmentRow(engineering, salaryGroup(inr, 3, "60000.75")),
      );

      const change = api.patch(`/api/employees/${movingEmployee.employeeId}/salary`);
      await change.set("Origin", new URL(change.url).origin).send({
        annualBaseSalary: "56000.01", salaryCurrencyCode: "USD",
        salaryVersion: movingEmployee.salaryVersion, reason: "Compensation currency change",
      }).expect(200);

      const overview = await api.get(countriesPath).expect(200);
      const selectedCountry = await api.get(departmentsPath(mainCountry.code)).expect(200);

      expectRows(countryRows(overview, mainCountry), [
        countryRow(mainCountry, salaryGroup(inr, 3, "60000.75")),
        countryRow(mainCountry, salaryGroup(usd, 2, "49500.005")),
        countryRow(mainCountry, salaryGroup(jpy, 1, "900000")),
      ]);
      expectRows((selectedCountry.body as DepartmentReport).rows, [
        departmentRow(engineering, salaryGroup(inr, 2, "34750.50")),
        departmentRow(engineering, salaryGroup(usd, 2, "49500.005")),
        departmentRow(finance, salaryGroup(inr, 1, "70000.25")),
        departmentRow(finance, salaryGroup(jpy, 1, "900000")),
      ]);
    });
  });

  it("includes every employee in a 10,000-employee country in both reports", async () => {
    await asHr(async (api, { otherCountry, engineering }) => {
      await db.execute(sql`
        insert into ${employee}
          (employee_id, full_name, country_code, department_id, annual_base_salary, salary_currency_code)
        select ${`INSIGHTS-${otherCountry.code}-BULK-`} || n, 'Pay insights capacity fixture',
          ${otherCountry.code}, ${engineering.id}, case when n <= 5000 then 90000.00 else 150000.00 end, 'INR'
        from generate_series(1, 9999) as n
      `);

      const [overview, selectedCountry] = await Promise.all([
        api.get(countriesPath).expect(200),
        api.get(departmentsPath(otherCountry.code)).expect(200),
      ]);
      const group = salaryGroup(inr, 10_000, "120000.00");

      expectRows(countryRows(overview, otherCountry), [countryRow(otherCountry, group)]);
      expectRows((selectedCountry.body as DepartmentReport).rows, [departmentRow(engineering, group)]);
    });
  });
});
