import { asc, count, eq, sql } from "drizzle-orm";
import { Router } from "express";

import type { Database } from "../../db/client.js";
import { country, currency, department, employee } from "../../db/schema/index.js";
import { sendError } from "../../http/errors.js";

const orderedSalaries = sql`array_agg(${employee.annualBaseSalary} order by ${employee.annualBaseSalary})`;
const lowerMiddle = sql`(${orderedSalaries})[((count(*) + 1) / 2)::integer]`;
const upperMiddle = sql`(${orderedSalaries})[((count(*) + 2) / 2)::integer]`;
const median = sql`trim_scale(${lowerMiddle} * 0.5 + ${upperMiddle} * 0.5)`;
const salaryMetrics = {
  salaryCurrencyCode: currency.code,
  salaryMinorUnits: currency.minorUnits,
  headcount: count(),
  medianAnnualBaseSalary: sql<string>`round(${median}, greatest(${currency.minorUnits}, scale(${median})))::text`,
};

export function createInsightsRouter(db: Database): Router {
  const router = Router({ caseSensitive: true });

  router.get("/countries", async (_req, res) => {
    const report = await db.transaction(async (transaction) => {
      const countries = await transaction.select().from(country).orderBy(asc(country.name), asc(country.code));
      const rows = await transaction.select({
        countryCode: country.code,
        countryName: country.name,
        ...salaryMetrics,
      }).from(employee)
        .innerJoin(country, eq(employee.countryCode, country.code))
        .innerJoin(currency, eq(employee.salaryCurrencyCode, currency.code))
        .groupBy(country.code, currency.code)
        .orderBy(asc(country.name), asc(country.code), asc(currency.code));

      return { countries, rows };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });

    res.json(report);
  });

  router.get("/countries/:countryCode/departments", async (req, res) => {
    const { countryCode } = req.params;
    if (!/^[A-Z]{2}$/u.test(countryCode)) {
      sendError(res, "badRequest");
      return;
    }

    const report = await db.transaction(async (transaction) => {
      const [selectedCountry] = await transaction.select().from(country).where(eq(country.code, countryCode));
      if (selectedCountry === undefined) {
        return undefined;
      }

      const rows = await transaction.select({
        departmentId: department.id,
        departmentName: department.name,
        ...salaryMetrics,
      }).from(employee)
        .innerJoin(department, eq(employee.departmentId, department.id))
        .innerJoin(currency, eq(employee.salaryCurrencyCode, currency.code))
        .where(eq(employee.countryCode, countryCode))
        .groupBy(department.id, currency.code)
        .orderBy(asc(department.name), asc(currency.code));

      return { country: selectedCountry, rows };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });

    if (report === undefined) {
      sendError(res, "notFound");
      return;
    }

    res.json(report);
  });

  return router;
}
