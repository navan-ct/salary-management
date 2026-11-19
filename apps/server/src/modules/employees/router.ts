import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Router } from "express";
import { z } from "zod";

import type { Database } from "../../db/client.js";
import { country, currency, department, employee, salaryChange } from "../../db/schema/index.js";
import { sendError } from "../../http/errors.js";

const pageSize = 50;
const positiveInteger = z.string().regex(/^[1-9]\d*$/u).transform(Number).pipe(z.int());
const directoryQuery = z.object({
  search: z.string().trim().optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/u).optional(),
  departmentId: positiveInteger.pipe(z.int32()).optional(),
  page: positiveInteger.optional(),
});

function employeeSummaries(db: Pick<Database, "select">) {
  return db.select({
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    countryCode: employee.countryCode,
    countryName: country.name,
    departmentId: employee.departmentId,
    departmentName: department.name,
    annualBaseSalary: employee.annualBaseSalary,
    salaryCurrencyCode: employee.salaryCurrencyCode,
    salaryMinorUnits: currency.minorUnits,
  }).from(employee)
    .innerJoin(country, eq(employee.countryCode, country.code))
    .innerJoin(department, eq(employee.departmentId, department.id))
    .innerJoin(currency, eq(employee.salaryCurrencyCode, currency.code));
}

export function createEmployeesRouter(db: Database): Router {
  const router = Router({ caseSensitive: true });

  router.get("/", async (req, res) => {
    const query = directoryQuery.safeParse(req.query);
    if (!query.success) {
      sendError(res, "badRequest");
      return;
    }

    const { search, countryCode, departmentId, page: requestedPage = 1 } = query.data;
    const namePattern = `%${search?.replace(/[!%_]/gu, "!$&") ?? ""}%`;
    const filters = and(
      search ? or(eq(employee.employeeId, search), sql`lower(${employee.fullName}) like lower(${namePattern}) escape '!'`) : undefined,
      countryCode === undefined ? undefined : eq(employee.countryCode, countryCode),
      departmentId === undefined ? undefined : eq(employee.departmentId, departmentId),
    );

    const result = await db.transaction(async (transaction) => {
      const total = await transaction.$count(employee, filters);
      const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
      const employees = await employeeSummaries(transaction).where(filters)
        .orderBy(asc(employee.fullName), asc(employee.employeeId)).limit(pageSize).offset((page - 1) * pageSize);
      const countries = await transaction.select().from(country).orderBy(asc(country.name), asc(country.code));
      const departments = await transaction.select().from(department).orderBy(asc(department.name));

      return { employees, page, pageSize, total, countries, departments };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });

    res.json(result);
  });

  router.get("/:employeeId", async (req, res) => {
    const [record] = await employeeSummaries(db).where(eq(employee.employeeId, req.params.employeeId));
    if (record === undefined) {
      sendError(res, "notFound");
      return;
    }

    res.json({ employee: record });
  });

  router.get("/:employeeId/salary-history", async (req, res) => {
    const employeeId = req.params.employeeId;
    const [record] = await db.select({ employeeId: employee.employeeId }).from(employee).where(eq(employee.employeeId, employeeId));
    if (record === undefined) {
      sendError(res, "notFound");
      return;
    }

    const previousCurrency = alias(currency, "previous_currency");
    const newCurrency = alias(currency, "new_currency");
    const history = await db.select({
      salaryVersion: salaryChange.salaryVersion,
      previousAmount: salaryChange.previousAmount,
      previousCurrencyCode: salaryChange.previousCurrencyCode,
      previousMinorUnits: previousCurrency.minorUnits,
      newAmount: salaryChange.newAmount,
      newCurrencyCode: salaryChange.newCurrencyCode,
      newMinorUnits: newCurrency.minorUnits,
      reason: salaryChange.reason,
      editorName: salaryChange.editorName,
      savedAt: salaryChange.savedAt,
    }).from(salaryChange)
      .innerJoin(previousCurrency, eq(salaryChange.previousCurrencyCode, previousCurrency.code))
      .innerJoin(newCurrency, eq(salaryChange.newCurrencyCode, newCurrency.code))
      .where(eq(salaryChange.employeeId, employeeId))
      .orderBy(desc(salaryChange.savedAt), desc(salaryChange.salaryVersion));

    res.json({ history });
  });

  return router;
}
