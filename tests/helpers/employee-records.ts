import { randomUUID } from "node:crypto";

import { eq, inArray, sql } from "drizzle-orm";

import type { Database } from "../../apps/server/src/db/client.js";
import { country, currency, department, employee, salaryChange, user } from "../../apps/server/src/db/schema/index.js";

export async function seedEmployeeRecords(db: Database) {
  const token = randomUUID();
  const groupName = `Directory ${token}`;
  const missingEmployeeId = `TEST-${token}-99`;

  return db.transaction(async (transaction) => {
    await transaction.insert(country).values([
      { code: "IN", name: "India" }, { code: "CA", name: "Canada" },
    ]).onConflictDoNothing();
    await transaction.insert(currency).values([
      { code: "INR", minorUnits: 2 }, { code: "CAD", minorUnits: 2 }, { code: "USD", minorUnits: 2 },
    ]).onConflictDoNothing();
    await transaction.insert(department).values([{ name: "Engineering" }, { name: "Finance" }]).onConflictDoNothing();

    const departments = await transaction.select().from(department).where(inArray(department.name, ["Engineering", "Finance"]));
    const engineering = departments.find(({ name }) => name === "Engineering");
    const finance = departments.find(({ name }) => name === "Finance");
    if (!engineering || !finance) {
      throw new Error("Employee fixture departments are missing.");
    }

    const engineeringEmployee = (identifier: number, name: string) => ({
      employeeId: `TEST-${token}-${String(identifier).padStart(2, "0")}`,
      fullName: `${groupName} ${name}`,
      countryCode: "IN",
      departmentId: engineering.id,
      annualBaseSalary: "96000.25",
      salaryCurrencyCode: "INR",
      salaryVersion: 0,
    });

    const firstCasey = engineeringEmployee(50, "Casey");
    const firstPage = [
      ...Array.from({ length: 49 }, (_, index) =>
        engineeringEmployee(49 - index, `A${String(index + 1).padStart(2, "0")}`)),
      firstCasey,
    ];
    const sameName = engineeringEmployee(51, "Casey");
    const record = {
      ...engineeringEmployee(52, "Dana"), annualBaseSalary: "124500.75", salaryCurrencyCode: "USD", salaryVersion: 2,
    };
    const inCanada = { ...engineeringEmployee(53, "Erin"), countryCode: "CA", salaryCurrencyCode: "CAD" };
    const inFinance = { ...engineeringEmployee(54, "Frankie"), departmentId: finance.id };
    const outsideSearch = { ...engineeringEmployee(55, ""), fullName: `Outside directory search ${token}` };
    const employees = [...firstPage, sameName, record, inCanada, inFinance, outsideSearch];
    await transaction.insert(employee).values(employees.toReversed());

    const editors = [
      { id: randomUUID(), email: `older-editor-${token}@acme.com`, name: "Devika Rao" },
      { id: randomUUID(), email: `recent-editor-${token}@acme.com`, name: "Priya Shah" },
    ] as const;
    await transaction.insert(user).values([...editors]);

    const olderChange = {
      employeeId: record.employeeId, salaryVersion: 1,
      previousAmount: "105000.00", previousCurrencyCode: "CAD", newAmount: "116000.10", newCurrencyCode: "INR",
      reason: "Annual salary review", editorUserId: editors[0].id, editorName: editors[0].name,
      savedAt: new Date("2025-11-01T09:45:00.000Z"),
    };
    const newerChange = {
      employeeId: record.employeeId, salaryVersion: 2,
      previousAmount: "116000.10", previousCurrencyCode: "INR", newAmount: "124500.75", newCurrencyCode: "USD",
      reason: "Promotion and currency change", editorUserId: editors[1].id, editorName: editors[1].name,
      savedAt: new Date("2026-04-01T05:00:00.000Z"),
    };
    await transaction.insert(salaryChange).values([olderChange, newerChange]);

    return {
      token, groupName, missingEmployeeId, engineering, finance,
      firstPage, firstCasey, sameName, record, inCanada, inFinance, olderChange, newerChange,
      async cleanUp() {
        await db.transaction(async (cleanup) => {
          await cleanup.execute(sql`alter table ${salaryChange} disable trigger salary_change_append_only`);
          await cleanup.delete(salaryChange).where(eq(salaryChange.employeeId, record.employeeId));
          await cleanup.execute(sql`alter table ${salaryChange} enable trigger salary_change_append_only`);
          await cleanup.delete(employee).where(inArray(employee.employeeId, employees.map(({ employeeId }) => employeeId)));
          await cleanup.delete(user).where(inArray(user.id, editors.map(({ id }) => id)));
        });
      },
    };
  });
}
