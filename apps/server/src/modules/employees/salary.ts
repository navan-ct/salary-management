import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "../../db/client.js";
import { currency, employee, salaryChange } from "../../db/schema/index.js";

const decimal = /^(?:\d+(?:\.\d+)?|\.\d+)$/u;

export const salaryDraft = z.object({
  annualBaseSalary: z.string({ error: "Enter an amount greater than 0." }).trim().refine(
    (amount) => decimal.test(amount) && /[1-9]/u.test(amount), "Enter a valid decimal amount greater than 0.",
  ),
  salaryCurrencyCode: z.string({ error: "Select a supported currency." }).regex(/^[A-Z]{3}$/u, "Select a supported currency."),
  salaryVersion: z.int32({ error: "Reload the record to get its current salary version." }).nonnegative("Reload the record to get its current salary version."),
  reason: z.string({ error: "Enter a reason for this change." })
    .refine((reason) => /[^\p{White_Space}\uFEFF]/u.test(reason), "Enter a reason for this change.")
    .refine((reason) => !reason.includes("\0"), "Remove null characters from the reason."),
});

type SalaryDraft = z.infer<typeof salaryDraft>;

type SaveResult =
  | { status: "missing" | "stale" | "unchanged" }
  | { status: "invalid"; fields: Record<string, string> }
  | { status: "saved"; salaryVersion: number };

export class SalaryWriteError extends Error {
  constructor(cause: unknown) {
    super("Salary write failed before commit.", { cause });
  }
}

export async function changeSalary(
  db: Database, employeeId: string, draft: SalaryDraft, manager: { id: string; name: string },
): Promise<SaveResult> {
  const { annualBaseSalary, salaryCurrencyCode, salaryVersion, reason } = draft;

  return db.transaction(async (transaction): Promise<SaveResult> => {
    const [selectedCurrency] = await transaction.select().from(currency).where(eq(currency.code, salaryCurrencyCode));
    if (!selectedCurrency) {
      return { status: "invalid", fields: { salaryCurrencyCode: "Select a supported currency." } };
    }

    const decimalPlaces = annualBaseSalary.split(".")[1]?.length ?? 0;
    if (decimalPlaces > selectedCurrency.minorUnits) {
      const { code, minorUnits } = selectedCurrency;
      return { status: "invalid", fields: { annualBaseSalary: minorUnits === 0
        ? `${code} requires a whole amount.` : `${code} allows up to ${String(minorUnits)} decimal places.` } };
    }

    const [current] = await transaction.select({
      annualBaseSalary: employee.annualBaseSalary,
      salaryCurrencyCode: employee.salaryCurrencyCode,
      salaryVersion: employee.salaryVersion,
      sameAmount: sql<boolean>`${employee.annualBaseSalary} = ${annualBaseSalary}::numeric`,
    }).from(employee).where(eq(employee.employeeId, employeeId)).for("update");

    if (!current) {
      return { status: "missing" };
    }
    if (current.salaryVersion !== salaryVersion) {
      return { status: "stale" };
    }
    if (current.sameAmount && current.salaryCurrencyCode === salaryCurrencyCode) {
      return { status: "unchanged" };
    }

    const nextVersion = salaryVersion + 1;
    try {
      const updated = await transaction.update(employee).set({ annualBaseSalary, salaryCurrencyCode, salaryVersion: nextVersion })
        .where(eq(employee.employeeId, employeeId));
      const recorded = await transaction.insert(salaryChange).values({
        employeeId, salaryVersion: nextVersion,
        previousAmount: current.annualBaseSalary, previousCurrencyCode: current.salaryCurrencyCode,
        newAmount: annualBaseSalary, newCurrencyCode: salaryCurrencyCode,
        reason, editorUserId: manager.id, editorName: manager.name,
      });
      if (updated.rowCount !== 1 || recorded.rowCount !== 1) {
        throw new Error("Expected one salary update and one history entry.");
      }
    } catch (error) {
      throw new SalaryWriteError(error);
    }

    return { status: "saved", salaryVersion: nextVersion };
  });
}
