import { eq, inArray, sql } from "drizzle-orm";

import type { Database } from "../../apps/server/src/db/client.js";
import { country, currency, department, employee, salaryChange } from "../../apps/server/src/db/schema/index.js";

export function seedPayInsightsRecords(db: Database) {
  return db.transaction(async (transaction) => {
    const countries: (typeof country.$inferSelect)[] = [];
    for (const suffix of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const code = `X${suffix}`;
      const [reserved] = await transaction.insert(country).values({ code, name: `Pay insights test ${code}` })
        .onConflictDoNothing().returning();
      if (reserved) {
        countries.push(reserved);
      }
      if (countries.length === 3) {
        break;
      }
    }
    const [mainCountry, otherCountry, emptyCountry] = countries;
    if (!mainCountry || !otherCountry || !emptyCountry) {
      throw new Error("Could not reserve test countries for pay insights.");
    }

    await transaction.insert(currency).values([
      { code: "INR", minorUnits: 2 }, { code: "USD", minorUnits: 2 }, { code: "JPY", minorUnits: 0 },
    ]).onConflictDoNothing();
    await transaction.insert(department).values([{ name: "Engineering" }, { name: "Finance" }]).onConflictDoNothing();
    const departments = await transaction.select().from(department)
      .where(inArray(department.name, ["Engineering", "Finance"]));
    const engineering = departments.find(({ name }) => name === "Engineering");
    const finance = departments.find(({ name }) => name === "Finance");
    if (!engineering || !finance) {
      throw new Error("Pay insights fixture departments are missing.");
    }

    const makeEmployee = (
      id: number, annualBaseSalary: string, salaryCurrencyCode: string,
      countryCode = mainCountry.code, departmentId = engineering.id,
    ) => ({
      employeeId: `INSIGHTS-${countryCode}-${String(id)}`, fullName: `Pay insights fixture ${String(id)}`,
      countryCode, departmentId, annualBaseSalary, salaryCurrencyCode, salaryVersion: 0,
    });

    const movingEmployee = makeEmployee(1, "92000.00", "INR");
    await transaction.insert(employee).values([
      movingEmployee,
      makeEmployee(2, "9500.25", "INR"),
      makeEmployee(3, "60000.75", "INR"),
      makeEmployee(4, "43000.00", "USD"),
      makeEmployee(5, "70000.25", "INR", mainCountry.code, finance.id),
      makeEmployee(6, "900000", "JPY", mainCountry.code, finance.id),
      makeEmployee(7, "240000.00", "INR", otherCountry.code),
    ]);

    return {
      mainCountry, otherCountry, emptyCountry, engineering, finance, movingEmployee,
      async cleanUp() {
        const movingEmployeeHistory = eq(salaryChange.employeeId, movingEmployee.employeeId);
        const historyCount = await db.$count(salaryChange, movingEmployeeHistory);
        const countryCodes = countries.map(({ code }) => code);
        await db.transaction(async (cleanup) => {
          if (historyCount > 0) {
            await cleanup.execute(sql`alter table ${salaryChange} disable trigger salary_change_append_only`);
            await cleanup.delete(salaryChange).where(movingEmployeeHistory);
            await cleanup.execute(sql`alter table ${salaryChange} enable trigger salary_change_append_only`);
          }
          await cleanup.delete(employee).where(inArray(employee.countryCode, countryCodes));
          await cleanup.delete(country).where(inArray(country.code, countryCodes));
        });
      },
    };
  });
}
