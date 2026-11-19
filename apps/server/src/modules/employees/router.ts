import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Router } from "express";
import { z } from "zod";

import type { Database } from "../../db/client.js";
import { country, currency, department, employee, salaryChange } from "../../db/schema/index.js";
import { errorType, sendError } from "../../http/errors.js";
import { SalaryWriteError, changeSalary, salaryDraft } from "./salary.js";

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
    salaryVersion: employee.salaryVersion,
  }).from(employee)
    .innerJoin(country, eq(employee.countryCode, country.code))
    .innerJoin(department, eq(employee.departmentId, department.id))
    .innerJoin(currency, eq(employee.salaryCurrencyCode, currency.code));
}

function readSalaryHistory(db: Pick<Database, "select">, employeeId: string) {
  const previousCurrency = alias(currency, "previous_currency");
  const newCurrency = alias(currency, "new_currency");
  return db.select({
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
    const { employeeId } = req.params;
    const record = await db.transaction(async (transaction) => {
      const [profile] = await employeeSummaries(transaction).where(eq(employee.employeeId, employeeId));
      if (profile === undefined) {
        return undefined;
      }

      const history = await readSalaryHistory(transaction, employeeId);
      const currencies = await transaction.select().from(currency).orderBy(asc(currency.code));
      return { employee: profile, history, currencies };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });

    if (record === undefined) {
      sendError(res, "notFound");
      return;
    }

    res.json(record);
  });

  router.get("/:employeeId/salary-history", async (req, res) => {
    const employeeId = req.params.employeeId;
    const [record] = await db.select({ employeeId: employee.employeeId }).from(employee).where(eq(employee.employeeId, employeeId));
    if (record === undefined) {
      sendError(res, "notFound");
      return;
    }

    res.json({ history: await readSalaryHistory(db, employeeId) });
  });

  router.patch("/:employeeId/salary", async (req, res) => {
    const { manager } = res.locals;
    if (!manager) {
      sendError(res, "unauthorized");
      return;
    }

    const draft = salaryDraft.safeParse(req.body);
    if (!draft.success) {
      const { fieldErrors } = z.flattenError(draft.error);
      const fields = Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, messages.join(" ")]));
      sendError(res, "invalidSalary", fields);
      return;
    }

    try {
      const result = await changeSalary(db, req.params.employeeId, draft.data, manager);
      switch (result.status) {
        case "saved":
          res.json({ salaryVersion: result.salaryVersion });
          return;
        case "missing":
          sendError(res, "notFound");
          return;
        case "stale":
          sendError(res, "staleSalary");
          return;
        case "unchanged":
          sendError(res, "unchangedSalary");
          return;
        case "invalid":
          sendError(res, "invalidSalary", result.fields);
          return;
      }
    } catch (error) {
      if (!(error instanceof SalaryWriteError)) {
        throw error;
      }

      req.log.error({ errorType: errorType(error.cause) }, "Salary change rolled back");
      sendError(res, "salaryRolledBack");
    }
  });

  return router;
}
