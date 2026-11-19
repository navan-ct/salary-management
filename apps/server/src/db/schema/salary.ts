import { sql } from "drizzle-orm";
import { check, index, integer, numeric, pgTable, primaryKey, smallint, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.js";

export const country = pgTable("country", {
  code: text().primaryKey(),
  name: text().notNull(),
}, (table) => [check("country_code_format", sql`${table.code} ~ '^[A-Z]{2}$'`)]);

export const currency = pgTable("currency", {
  code: text().primaryKey(),
  minorUnits: smallint("minor_units").notNull(),
}, (table) => [
  check("currency_code_format", sql`${table.code} ~ '^[A-Z]{3}$'`),
  check("currency_minor_units_nonnegative", sql`${table.minorUnits} >= 0`),
]);

export const department = pgTable("department", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
});

export const employee = pgTable("employee", {
  employeeId: text("employee_id").primaryKey(),
  fullName: text("full_name").notNull(),
  countryCode: text("country_code").notNull().references(() => country.code, { onDelete: "restrict" }),
  departmentId: integer("department_id").notNull().references(() => department.id, { onDelete: "restrict" }),
  annualBaseSalary: numeric("annual_base_salary").notNull(),
  salaryCurrencyCode: text("salary_currency_code").notNull().references(() => currency.code, { onDelete: "restrict" }),
  salaryVersion: integer("salary_version").notNull().default(0),
}, (table) => [
  check("employee_salary_positive_finite", sql`${table.annualBaseSalary} > 0 and ${table.annualBaseSalary} < 'Infinity'::numeric`),
  check("employee_salary_version_nonnegative", sql`${table.salaryVersion} >= 0`),
  index("employee_full_name_employee_id_idx").on(table.fullName, table.employeeId),
  index("employee_country_code_idx").on(table.countryCode),
  index("employee_department_id_idx").on(table.departmentId),
  index("employee_full_name_trgm_idx").using("gin", sql`lower(${table.fullName}) gin_trgm_ops`),
]);

export const salaryChange = pgTable("salary_change", {
  employeeId: text("employee_id").notNull().references(() => employee.employeeId, { onDelete: "restrict" }),
  salaryVersion: integer("salary_version").notNull(),
  previousAmount: numeric("previous_amount").notNull(),
  previousCurrencyCode: text("previous_currency_code").notNull().references(() => currency.code, { onDelete: "restrict" }),
  newAmount: numeric("new_amount").notNull(),
  newCurrencyCode: text("new_currency_code").notNull().references(() => currency.code, { onDelete: "restrict" }),
  reason: text().notNull(),
  editorUserId: text("editor_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  editorName: text("editor_name").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
}, (table) => [
  primaryKey({ columns: [table.employeeId, table.salaryVersion] }),
  check("salary_change_version_positive", sql`${table.salaryVersion} > 0`),
  check("salary_change_amounts_positive_finite", sql`
    ${table.previousAmount} > 0 and ${table.previousAmount} < 'Infinity'::numeric
    and ${table.newAmount} > 0 and ${table.newAmount} < 'Infinity'::numeric
  `),
  check("salary_change_reason_nonblank", sql`${table.reason} ~ U&'[^[:space:]\\0085\\00A0\\1680\\2000-\\200A\\2028\\2029\\202F\\205F\\3000\\FEFF]'`),
  check("salary_change_amount_or_currency_changed", sql`
    ${table.previousAmount} <> ${table.newAmount} or ${table.previousCurrencyCode} <> ${table.newCurrencyCode}
  `),
]);
