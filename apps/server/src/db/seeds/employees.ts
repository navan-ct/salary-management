import process from "node:process";

import { inArray } from "drizzle-orm";

import { databaseUrlSchema } from "../../config/env.js";
import { createDatabase } from "../client.js";
import { country, currency, department, employee } from "../schema/index.js";
import { generateEmployeeSeed, seedCountries, seedCurrencies, seedDepartmentNames } from "./employee-data.js";

const batchSize = 500;

async function main() {
  const databaseUrl = databaseUrlSchema.safeParse(process.env.DATABASE_URL);
  if (!databaseUrl.success) {
    process.stderr.write("Set DATABASE_URL to a PostgreSQL connection URL for the employee seed.\n");
    process.exitCode = 1;
    return;
  }

  const employees = generateEmployeeSeed();
  const { db, pool } = createDatabase(databaseUrl.data);

  try {
    const inserted = await db.transaction(async (transaction) => {
      await transaction.insert(country).values(seedCountries).onConflictDoNothing({ target: country.code });
      await transaction.insert(currency).values(seedCurrencies).onConflictDoNothing({ target: currency.code });
      await transaction.insert(department).values(seedDepartmentNames.map((name) => ({ name })))
        .onConflictDoNothing({ target: department.name });

      const rows = await transaction.select({ id: department.id, name: department.name }).from(department)
        .where(inArray(department.name, seedDepartmentNames));
      const departmentIds = new Map(rows.map(({ id, name }) => [name, id]));

      let count = 0;
      for (let offset = 0; offset < employees.length; offset += batchSize) {
        const batch = employees.slice(offset, offset + batchSize).map(({ departmentName, ...record }) => {
          const departmentId = departmentIds.get(departmentName);
          if (departmentId === undefined) {
            throw new Error("Employee seed department is missing.");
          }
          return { ...record, departmentId };
        });
        const result = await transaction.insert(employee).values(batch).onConflictDoNothing({ target: employee.employeeId });
        count += result.rowCount ?? 0;
      }
      return count;
    });

    process.stdout.write(`Employee seed complete. ${inserted.toLocaleString("en-US")} added, ${(employees.length - inserted).toLocaleString("en-US")} already present.\n`);
  } finally {
    await pool.end();
  }
}

try {
  await main();
} catch {
  process.stderr.write("Could not seed employees. Check the database connection and migrations.\n");
  process.exitCode = 1;
}
