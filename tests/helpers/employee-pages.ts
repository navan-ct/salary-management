import { type Page, test as base, expect } from "@playwright/test";

import type { Database } from "../../apps/server/src/db/client.js";
import { expireAuthSessions, withTestAccount } from "./auth-account.js";
import { seedEmployeeRecords } from "./employee-records.js";

type EmployeeRecords = Awaited<ReturnType<typeof seedEmployeeRecords>>;
interface HrSession { db: Database; expire: () => Promise<void> }

export const test = base.extend<{ records: EmployeeRecords; hrSession: HrSession }>({
  hrSession: async ({ page }, use) => {
    await withTestAccount(async ({ id, email, password }, db) => {
      await expect(await page.request.post("/api/auth/sign-in/email", { data: { email, password } })).toBeOK();

      await use({ db, expire: async () => {
        expect(await expireAuthSessions(db, id)).toBe(1);
      } });
    });
  },
  records: async ({ hrSession }, use) => {
    const records = await seedEmployeeRecords(hrSession.db);
    try {
      await use(records);
    } finally {
      await records.cleanUp();
    }
  },
});

export function employeeSearch(page: Page) {
  return page.getByRole("searchbox", { name: "Employee name or ID" });
}

export function employeeRows(page: Page) {
  return page.getByRole("table", { name: "Employees", exact: true }).getByRole("row")
    .filter({ has: page.getByRole("cell") });
}

export async function selectDirectoryFilter(page: Page, name: "Country" | "Department", option: string) {
  await page.getByRole("combobox", { name, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

export async function expectDirectoryFilters(page: Page, country: string, department: string) {
  await expect(page.getByRole("combobox", { name: "Country", exact: true })).toHaveText(country);
  await expect(page.getByRole("combobox", { name: "Department", exact: true })).toHaveText(department);
}

export async function holdRequest(page: Page, matches: (url: URL) => boolean) {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route(matches, async (route) => {
    await pending;
    await route.continue();
  }, { times: 1 });

  return release;
}
