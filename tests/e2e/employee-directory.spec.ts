import { expect } from "@playwright/test";

import { employeeRows, employeeSearch, expectDirectoryFilters, holdRequest, selectDirectoryFilter, test } from "../helpers/employee-pages.js";

const directory = "/employees";
const directoryRequest = (url: URL) => url.pathname === "/api/employees";

test("opens the unfiltered directory and pages through an ordered set of matching employees", async ({ page, records }) => {
  await page.goto(directory);

  await expect(page.getByRole("heading", { name: "Employee directory", exact: true })).toBeVisible();
  await expect(employeeSearch(page)).toHaveValue("");
  await expectDirectoryFilters(page, "All countries", "All departments");
  const table = page.getByRole("table", { name: "Employees", exact: true });
  await expect(table.getByRole("columnheader")).toHaveText([
    "Employee name", "Employee ID", "Country", "Department", "Current annual base salary",
  ]);
  const rows = employeeRows(page);
  await expect(rows).toHaveCount(50);

  const pagination = page.getByRole("navigation", { name: "Pagination" });
  const previous = pagination.getByRole("button", { name: "Previous" });
  const next = pagination.getByRole("button", { name: "Next" });

  await employeeSearch(page).fill(records.groupName);
  await expect(pagination.getByRole("status")).toHaveText("Showing 1–50 of 54 employees");
  await expect(previous).toBeDisabled();
  await expect(rows.last().getByRole("cell", { name: records.firstCasey.employeeId, exact: true })).toBeVisible();

  await next.click();
  await expect(pagination.getByRole("status")).toHaveText("Showing 51–54 of 54 employees");
  await expect(rows).toHaveCount(4);
  await expect(rows.first().getByRole("cell", { name: records.sameName.employeeId, exact: true })).toBeVisible();
  await expect(next).toBeDisabled();

  await previous.click();
  await expect(pagination.getByRole("status")).toHaveText("Showing 1–50 of 54 employees");
  await expect(rows).toHaveCount(50);
});

test("finds an employee by full ID and by a case-insensitive name fragment", async ({ page, records }) => {
  await page.goto(directory);

  const search = employeeSearch(page);
  await search.fill(records.record.employeeId);
  const rows = employeeRows(page);
  await expect(rows).toHaveCount(1);
  await expect(rows.getByRole("link", { name: records.record.fullName, exact: true })).toBeVisible();
  for (const value of [records.record.employeeId, "India", "Engineering", "USD 124,500.75"]) {
    await expect(rows.getByRole("cell", { name: value, exact: true })).toBeVisible();
  }

  await search.fill(`${records.token.slice(-8)} eRi`);
  await expect(rows).toHaveCount(1);
  await expect(rows.getByRole("link", { name: records.inCanada.fullName, exact: true })).toBeVisible();
  await expect(rows.getByRole("cell", { name: "Canada", exact: true })).toBeVisible();
});

test("restarts on the first page when the search, country or department changes", async ({ page, records }) => {
  await page.goto(directory);
  await employeeSearch(page).fill(records.token);

  const pagination = page.getByRole("navigation", { name: "Pagination" });
  const next = pagination.getByRole("button", { name: "Next" });
  const pageStatus = pagination.getByRole("status");
  await expect(pageStatus).toHaveText("Showing 1–50 of 55 employees");

  await next.click();
  await expect(pageStatus).toHaveText("Showing 51–55 of 55 employees");
  await employeeSearch(page).fill(records.groupName);
  await expect(pageStatus).toHaveText("Showing 1–50 of 54 employees");

  await next.click();
  await expect(pageStatus).toHaveText("Showing 51–54 of 54 employees");
  await selectDirectoryFilter(page, "Country", "India");
  await expect(pageStatus).toHaveText("Showing 1–50 of 53 employees");

  await next.click();
  await expect(pageStatus).toHaveText("Showing 51–53 of 53 employees");
  await selectDirectoryFilter(page, "Department", "Engineering");
  await expect(pageStatus).toHaveText("Showing 1–50 of 52 employees");
});

test("keeps search and filter controls available with no matches and supports clearing them", async ({ page, records }) => {
  await page.goto(directory);
  await selectDirectoryFilter(page, "Country", "India");
  await selectDirectoryFilter(page, "Department", "Finance");

  const search = employeeSearch(page);
  const empty = page.getByRole("status").filter({ hasText: "No matching employees" });
  await search.fill(records.record.employeeId);
  await expect(empty).toBeVisible();
  await expect(search).toHaveValue(records.record.employeeId);
  await expectDirectoryFilters(page, "India", "Finance");
  await expect(employeeRows(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toHaveValue("");
  await expectDirectoryFilters(page, "India", "Finance");

  await search.fill(records.record.employeeId);
  await selectDirectoryFilter(page, "Department", "All departments");
  const employee = employeeRows(page).getByRole("link", { name: records.record.fullName, exact: true });
  await expect(employee).toBeVisible();
  await expectDirectoryFilters(page, "India", "All departments");

  await selectDirectoryFilter(page, "Country", "Canada");
  await expect(empty).toBeVisible();
  await selectDirectoryFilter(page, "Country", "All countries");
  await expect(employee).toBeVisible();
  await expect(search).toHaveValue(records.record.employeeId);

  await selectDirectoryFilter(page, "Country", "India");
  await selectDirectoryFilter(page, "Department", "Engineering");
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(search).toHaveValue("");
  await expectDirectoryFilters(page, "All countries", "All departments");
  await expect(employeeRows(page)).toHaveCount(50);
});

test("announces loading while the directory request is pending", async ({ page, records }) => {
  const release = await holdRequest(page, directoryRequest);
  const loading = page.getByRole("status").filter({ hasText: /loading employees/iu });
  try {
    await page.goto(directory);
    await expect(loading).toBeVisible();
    await expect(employeeRows(page)).toHaveCount(0);
  } finally {
    release();
  }

  await expect(loading).toBeHidden();
  await expect(employeeRows(page)).toHaveCount(50);
  await employeeSearch(page).fill(records.record.employeeId);
  await expect(employeeRows(page).getByRole("link", { name: records.record.fullName, exact: true })).toBeVisible();
});

test("retries a directory load with the same search, filters and page", async ({ page, records }) => {
  await page.goto(directory);
  await employeeSearch(page).fill(records.groupName);
  await selectDirectoryFilter(page, "Country", "India");
  await selectDirectoryFilter(page, "Department", "Engineering");

  const pagination = page.getByRole("navigation", { name: "Pagination" });
  await expect(pagination.getByRole("status")).toHaveText("Showing 1–50 of 52 employees");

  await page.route(directoryRequest, async (route) => {
    await route.fulfill({
      status: 503, json: { error: { code: "SERVICE_UNAVAILABLE", message: "Service is unavailable." } },
    });
  }, { times: 1 });
  await pagination.getByRole("button", { name: "Next" }).click();

  await expect(page.getByRole("alert")).toContainText("Couldn’t load employees");
  await expect(employeeSearch(page)).toHaveValue(records.groupName);
  await expectDirectoryFilters(page, "India", "Engineering");
  await page.getByRole("button", { name: "Retry", exact: true }).click();

  await expect(pagination.getByRole("status")).toHaveText("Showing 51–52 of 52 employees");
  const rows = employeeRows(page);
  await expect(rows).toHaveCount(2);
  await expect(rows.first().getByRole("cell", { name: records.sameName.employeeId, exact: true })).toBeVisible();
  await expect(rows.last().getByRole("link", { name: records.record.fullName, exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toBeHidden();
});
