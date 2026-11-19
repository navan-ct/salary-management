import { type Locator, type Page, expect } from "@playwright/test";

import { holdRequest, test as employeeTest } from "../helpers/employee-pages.js";
import { seedPayInsightsRecords } from "../helpers/pay-insights-records.js";

const insightsPath = "/insights";
const countriesPath = "/api/insights/countries";
const countriesRequest = (url: URL) => url.pathname === countriesPath;
const departmentsRequest = (countryCode: string) => (url: URL) =>
  url.pathname === `${countriesPath}/${countryCode}/departments`;
const loadError = "Couldn’t load pay insights";
const emptyReport = "No employee records";

type InsightsRecords = Awaited<ReturnType<typeof seedPayInsightsRecords>>;
const test = employeeTest.extend<{ insightsRecords: InsightsRecords }>({
  insightsRecords: async ({ hrSession }, use) => {
    const records = await seedPayInsightsRecords(hrSession.db);
    try {
      await use(records);
    } finally {
      await records.cleanUp();
    }
  },
});

function countryPicker(page: Page) {
  return page.getByRole("combobox", { name: "Country", exact: true });
}

async function selectCountry(page: Page, name: string) {
  await countryPicker(page).click();
  await page.getByRole("option", { name, exact: true }).click();
  await expect(countryPicker(page)).toHaveText(name);
}

function reportTable(page: Page) {
  return page.getByRole("main").getByRole("table");
}

async function expectColumns(table: Locator, first: "Country" | "Department") {
  await expect(table.getByRole("columnheader")).toHaveText([first, "Currency", "Headcount", "Median annual base salary"]);
}

async function expectReportRow(
  page: Page, [group, code, headcount, median]: readonly [string, string, string, string],
) {
  const row = reportTable(page).getByRole("row")
    .filter({ has: page.getByText(group, { exact: true }) })
    .filter({ has: page.getByRole("cell", { name: code, exact: true }) });
  await expect(row.getByRole("rowheader").or(row.getByRole("cell"))).toHaveText([group, code, headcount, median]);
}

test("opens the country report from Employees, drills into one country, and returns to all countries", async ({
  page, insightsRecords: { mainCountry, otherCountry },
}) => {
  await page.goto("/employees");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  const insightsLink = navigation.getByRole("link", { name: "Pay insights", exact: true });
  await expect(insightsLink).toBeVisible();
  await insightsLink.click();

  await expect(page).toHaveURL((url) => url.pathname === insightsPath);
  await expect(insightsLink).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Pay insights", exact: true })).toBeVisible();
  await expect(countryPicker(page)).toHaveText("All countries");
  await expect(page.getByText("By country", { exact: true })).toBeVisible();
  await expectColumns(reportTable(page), "Country");
  await expectReportRow(page, [mainCountry.name, "INR", "4", "INR 65,000.50"]);
  await expectReportRow(page, [mainCountry.name, "USD", "1", "USD 43,000.00"]);
  await expectReportRow(page, [otherCountry.name, "INR", "1", "INR 240,000.00"]);
  await expect(page.getByRole("button", { name: "Refresh", exact: true })).toHaveCount(0);

  await selectCountry(page, mainCountry.name);
  await expect(page.getByText(`By department in ${mainCountry.name}`, { exact: true })).toBeVisible();
  await expectColumns(reportTable(page), "Department");
  await expectReportRow(page, ["Engineering", "INR", "3", "INR 60,000.75"]);
  await expectReportRow(page, ["Engineering", "USD", "1", "USD 43,000.00"]);
  await expectReportRow(page, ["Finance", "INR", "1", "INR 70,000.25"]);
  await expectReportRow(page, ["Finance", "JPY", "1", "JPY 900,000"]);
  await expect(reportTable(page).getByRole("row").filter({ has: page.getByRole("cell") })).toHaveCount(4);

  await selectCountry(page, "All countries");
  await expect(page.getByText("By country", { exact: true })).toBeVisible();
  await expectColumns(reportTable(page), "Country");
  await expectReportRow(page, [otherCountry.name, "INR", "1", "INR 240,000.00"]);
});

test("announces loading while the country report is pending", async ({ page, insightsRecords: { mainCountry } }) => {
  const release = await holdRequest(page, countriesRequest);
  const loading = page.getByRole("status").filter({ hasText: /loading pay insights/iu });
  try {
    await page.goto(insightsPath);
    await expect(loading).toBeVisible();
    await expect(reportTable(page)).toBeHidden();
  } finally {
    release();
  }

  await expect(loading).toBeHidden();
  await expectReportRow(page, [mainCountry.name, "INR", "4", "INR 65,000.50"]);
});

test("shows the empty state for a selected country and allows returning to the country report", async ({
  page, insightsRecords: { mainCountry, emptyCountry },
}) => {
  await page.goto(insightsPath);
  await expectReportRow(page, [mainCountry.name, "INR", "4", "INR 65,000.50"]);
  await selectCountry(page, emptyCountry.name);

  await expect(page.getByText(`By department in ${emptyCountry.name}`, { exact: true })).toBeVisible();
  const status = page.getByRole("status").filter({ hasText: emptyReport });
  await expect(status).toContainText("There are no employee records to report for this view.");
  await expect(reportTable(page)).toBeHidden();

  await selectCountry(page, "All countries");
  await expect(status).toBeHidden();
  await expectReportRow(page, [mainCountry.name, "INR", "4", "INR 65,000.50"]);
});

test("shows the empty state when the all-countries report has no employee records", async ({
  page, insightsRecords: { emptyCountry },
}) => {
  await page.route(countriesRequest, async (route) => {
    await route.fulfill({ json: { countries: [emptyCountry], rows: [] } });
  }, { times: 1 });
  await page.goto(insightsPath);

  await expect(countryPicker(page)).toHaveText("All countries");
  await expect(page.getByText("By country", { exact: true })).toBeVisible();
  const status = page.getByRole("status").filter({ hasText: emptyReport });
  await expect(status).toContainText("There are no employee records to report for this view.");
  await expect(reportTable(page)).toBeHidden();
});

async function failNextReport(page: Page, matches: (url: URL) => boolean) {
  await page.route(matches, async (route) => {
    await route.fulfill({
      status: 503, json: { error: { code: "SERVICE_UNAVAILABLE", message: "Service is unavailable." } },
    });
  }, { times: 1 });
}

test("retries the initial country report when it fails to load", async ({ page, insightsRecords: { mainCountry } }) => {
  await failNextReport(page, countriesRequest);
  await page.goto(insightsPath);

  const alert = page.getByRole("alert").filter({ hasText: loadError });
  await expect(alert).toContainText("Try loading this view again.");
  await expect(reportTable(page)).toBeHidden();

  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(alert).toBeHidden();
  await expect(countryPicker(page)).toHaveText("All countries");
  await expectReportRow(page, [mainCountry.name, "INR", "4", "INR 65,000.50"]);
});

test("keeps the selected country when its department report fails and retries that report", async ({
  page, insightsRecords: { mainCountry },
}) => {
  await page.goto(insightsPath);
  await expectReportRow(page, [mainCountry.name, "INR", "4", "INR 65,000.50"]);
  await failNextReport(page, departmentsRequest(mainCountry.code));
  await selectCountry(page, mainCountry.name);
  const alert = page.getByRole("alert").filter({ hasText: loadError });
  await expect(alert).toContainText("Try loading this view again.");
  await expect(page.getByText(`By department in ${mainCountry.name}`, { exact: true })).toBeVisible();
  await expect(countryPicker(page)).toHaveText(mainCountry.name);
  await expect(reportTable(page)).toBeHidden();

  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expectReportRow(page, ["Engineering", "INR", "3", "INR 60,000.75"]);
  await expect(countryPicker(page)).toHaveText(mainCountry.name);
  await expect(alert).toBeHidden();
});

test("reflects a saved currency change after browser reload and when reopening the department report", async ({
  page, insightsRecords: { mainCountry, movingEmployee },
}) => {
  await page.goto(insightsPath);
  await expectReportRow(page, [mainCountry.name, "USD", "1", "USD 43,000.00"]);
  await selectCountry(page, mainCountry.name);
  await expectReportRow(page, ["Engineering", "USD", "1", "USD 43,000.00"]);

  const employeePage = await page.context().newPage();
  try {
    await employeePage.goto(`/employees/${movingEmployee.employeeId}`);
    await employeePage.getByRole("button", { name: "Change salary", exact: true }).click();
    await employeePage.getByRole("combobox", { name: "Currency", exact: true }).click();
    await employeePage.getByRole("option", { name: /^USD\b/u }).click();
    await employeePage.getByLabel("Annual base salary", { exact: true }).fill("56000.02");
    await employeePage.getByLabel("Reason for change", { exact: true }).fill("Compensation currency change");
    await employeePage.getByRole("button", { name: "Save salary change", exact: true }).click();
    await expect(employeePage.getByRole("status").filter({ hasText: "Salary change saved" })).toBeVisible();
  } finally {
    await employeePage.close();
  }

  await page.reload();
  await expect(countryPicker(page)).toHaveText("All countries");
  await expectReportRow(page, [mainCountry.name, "INR", "3", "INR 60,000.75"]);
  await expectReportRow(page, [mainCountry.name, "USD", "2", "USD 49,500.01"]);

  await selectCountry(page, mainCountry.name);
  await expectReportRow(page, ["Engineering", "INR", "2", "INR 34,750.50"]);
  await expectReportRow(page, ["Engineering", "USD", "2", "USD 49,500.01"]);
});

test("returns to sign-in if the manager's session expires before opening a department report", async ({
  page, insightsRecords: { mainCountry }, hrSession,
}) => {
  await page.goto(insightsPath);
  await expectReportRow(page, [mainCountry.name, "INR", "4", "INR 65,000.50"]);
  await hrSession.expire();
  await countryPicker(page).click();
  await page.getByRole("option", { name: mainCountry.name, exact: true }).click();

  await expect(page).toHaveURL((url) => url.pathname === "/sign-in");
  await expect(page.getByText("Your session expired", { exact: true })).toBeVisible();
  await expect(reportTable(page)).toBeHidden();
});
