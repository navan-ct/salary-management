import { expect } from "@playwright/test";

import { employeeRows, employeeSearch, expectDirectoryFilters, holdRequest, selectDirectoryFilter, test } from "../helpers/employee-pages.js";

test.use({ timezoneId: "Asia/Kolkata" });

test("opens an employee's current salary and newest-first history and returns to the same directory view", async ({ page, records }) => {
  const { record } = records;
  await page.goto("/employees");
  await employeeSearch(page).fill(records.groupName);
  await selectDirectoryFilter(page, "Country", "India");
  await selectDirectoryFilter(page, "Department", "Engineering");

  const pagination = page.getByRole("navigation", { name: "Pagination" });
  const pageStatus = pagination.getByRole("status");
  await expect(pageStatus).toHaveText("Showing 1–50 of 52 employees");
  await pagination.getByRole("button", { name: "Next" }).click();
  await expect(pageStatus).toHaveText("Showing 51–52 of 52 employees");
  await employeeRows(page).getByRole("link", { name: record.fullName, exact: true }).click();

  await expect(page).toHaveURL((url) => url.pathname === `/employees/${record.employeeId}`);
  await expect(page.getByRole("heading", { name: record.fullName, exact: true })).toBeVisible();
  await expect(page.getByText("Current annual base salary", { exact: true })).toBeVisible();
  await expect(page.getByRole("definition")).toHaveText([record.employeeId, "India", "Engineering", "USD 124,500.75"]);
  await expect(page.getByRole("button", { name: "Change salary", exact: true })).toBeEnabled();

  await expect(page.getByRole("heading", { name: "Salary history", exact: true })).toBeVisible();
  const history = page.getByRole("table", { name: "Salary history", exact: true });
  await expect(history.getByRole("columnheader")).toHaveText([
    "Saved date and time", "Previous salary", "New salary", "Reason", "Saved by",
  ]);
  const historyRows = history.getByRole("row").filter({ has: page.getByRole("cell") });
  const historyCells = page.getByRole("cell").or(page.getByRole("rowheader"));
  await expect(historyRows).toHaveCount(2);
  await expect(historyRows.first().locator(historyCells)).toHaveText([
    "01 Apr 2026 · 10:30 IST", "INR 116,000.10", "USD 124,500.75", "Promotion and currency change", "Priya Shah",
  ]);
  await expect(historyRows.last().locator(historyCells)).toHaveText([
    "01 Nov 2025 · 15:15 IST", "CAD 105,000.00", "INR 116,000.10", "Annual salary review", "Devika Rao",
  ]);
  await expect(history.getByRole("button")).toHaveCount(0);
  await expect(history.getByRole("textbox")).toHaveCount(0);

  await page.getByRole("main").getByRole("link", { name: "Employee directory", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/employees");
  await expect(employeeSearch(page)).toHaveValue(records.groupName);
  await expectDirectoryFilters(page, "India", "Engineering");
  await expect(pageStatus).toHaveText("Showing 51–52 of 52 employees");
  await expect(employeeRows(page).getByRole("link", { name: record.fullName, exact: true })).toBeVisible();
});

test("announces record loading and then shows the current salary and explicit empty history", async ({ page, records }) => {
  const { employeeId, fullName } = records.inCanada;
  const release = await holdRequest(page, (url) => url.pathname === `/api/employees/${employeeId}`);
  const loading = page.getByRole("status").filter({ hasText: /loading employee record/iu });
  try {
    await page.goto(`/employees/${employeeId}`);
    await expect(loading).toBeVisible();
    await expect(page.getByText("No salary changes have been recorded for this employee.", { exact: true })).toBeHidden();
  } finally {
    release();
  }

  await expect(loading).toBeHidden();
  await expect(page.getByRole("heading", { name: fullName, exact: true })).toBeVisible();
  await expect(page.getByText("CAD 96,000.25", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Salary history", exact: true })).toBeVisible();
  await expect(page.getByText("No salary changes have been recorded for this employee.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change salary", exact: true })).toBeEnabled();
});

test("shows a missing-record message and links a direct visitor back to the default directory", async ({ page, records }) => {
  await page.goto(`/employees/${records.missingEmployeeId}`);

  await expect(page.getByText("Employee record unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("We couldn’t find this employee.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Salary history", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Change salary", exact: true })).toBeHidden();

  await page.getByRole("main").getByRole("link", { name: "Employee directory", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/employees");
  await expect(employeeSearch(page)).toHaveValue("");
  await expectDirectoryFilters(page, "All countries", "All departments");
  await expect(employeeRows(page)).toHaveCount(50);
});

test("returns to sign-in if the manager's session expires before opening a record", async ({ page, records, hrSession }) => {
  await page.goto("/employees");
  await employeeSearch(page).fill(records.record.employeeId);
  const employeeLink = employeeRows(page).getByRole("link", { name: records.record.fullName, exact: true });
  await expect(employeeLink).toBeVisible();

  await hrSession.expire();
  await employeeLink.click();

  await expect(page).toHaveURL((url) => url.pathname === "/sign-in");
  await expect(page.getByText("Your session expired", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: records.record.fullName, exact: true })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Salary history", exact: true })).toBeHidden();
});
