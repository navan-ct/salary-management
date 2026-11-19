import { type Page, expect } from "@playwright/test";

import { currency } from "../../apps/server/src/db/schema/index.js";
import { withTestAccount } from "../helpers/auth-account.js";
import { holdRequest, test } from "../helpers/employee-pages.js";

const currentSalary = "USD 124,500.75";
const reasonForChange = "Adjusted compensation after role review";
const saveFailureTitle = "Salary change wasn’t saved";

function salaryDraft(page: Page) {
  return {
    heading: page.getByRole("heading", { name: "Change salary", exact: true }),
    currency: page.getByRole("combobox", { name: "Currency", exact: true }),
    amount: page.getByLabel("Annual base salary", { exact: true }),
    reason: page.getByLabel("Reason for change", { exact: true }),
    save: page.getByRole("button", { name: "Save salary change", exact: true }),
    cancel: page.getByRole("button", { name: "Cancel", exact: true }),
  };
}

function salaryHistory(page: Page) {
  return page.getByRole("table", { name: "Salary history", exact: true }).getByRole("row")
    .filter({ has: page.getByRole("cell") });
}

function saveRequest(employeeId: string) {
  return (url: URL) => url.pathname === `/api/employees/${employeeId}/salary`;
}

async function startDraft(page: Page, employeeId: string) {
  await page.goto(`/employees/${employeeId}`);
  const draft = salaryDraft(page);
  await page.getByRole("button", { name: "Change salary", exact: true }).click();
  await expect(draft.heading).toBeVisible({ timeout: 3_000 });
  return draft;
}

async function chooseCurrency(page: Page, code: string) {
  await salaryDraft(page).currency.click();
  await page.getByRole("option", { name: new RegExp(`^${code}\\b`, "u") }).click();
}

async function expectSavedRecord(page: Page, employeeId: string, salary: string, reason: string, editor: string) {
  await expect(page).toHaveURL((url) => url.pathname === `/employees/${employeeId}`);
  await expect(salaryDraft(page).heading).toBeHidden();
  await expect(page.getByRole("definition").getByText(salary, { exact: true })).toBeVisible();
  const history = salaryHistory(page);
  await expect(history).toHaveCount(3);
  await expect(history.first().getByRole("cell").or(history.first().getByRole("rowheader"))).toHaveText([
    /\d{2} \p{L}{3,} \d{4} · \d{2}:\d{2}/u, currentSalary, salary, reason, editor,
  ]);
}

test("shows the employee and current salary, defaults the draft, and discards it on cancel", async ({ page, records, hrSession }) => {
  const { employeeId, fullName } = records.record;
  const draft = await startDraft(page, employeeId);
  await expect(page.getByText(fullName, { exact: false })).toBeVisible();
  await expect(page.getByText(employeeId, { exact: false })).toBeVisible();
  await expect(page.getByText("Current annual base salary", { exact: true })).toBeVisible();
  await expect(page.getByText(currentSalary, { exact: true })).toBeVisible();
  await expect(draft.currency).toHaveText(/^USD\b/u);
  await expect(draft.amount).toHaveValue("");
  await expect(draft.reason).toHaveValue("");

  const supported = await hrSession.db.select({ code: currency.code }).from(currency);
  await draft.currency.click();
  await expect(page.getByRole("option")).toHaveCount(supported.length);
  for (const { code } of supported) {
    await expect(page.getByRole("option", { name: new RegExp(`^${code}\\b`, "u") })).toBeVisible();
  }
  await page.getByRole("option", { name: /^CAD\b/u }).click();
  await draft.amount.fill("135000.50");
  await draft.reason.fill(reasonForChange);
  await draft.cancel.click();

  await expect(page).toHaveURL((url) => url.pathname === `/employees/${employeeId}`);
  await expect(page.getByRole("heading", { name: fullName, exact: true })).toBeVisible();
  await expect(page.getByRole("definition").getByText(currentSalary, { exact: true })).toBeVisible();
  await expect(salaryHistory(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Change salary", exact: true }).click();
  await expect(draft.currency).toHaveText(/^USD\b/u);
  await expect(draft.amount).toHaveValue("");
  await expect(draft.reason).toHaveValue("");
});

test("clears the amount on each currency switch and identifies invalid fields while retaining the draft", async ({ page, records }) => {
  const draft = await startDraft(page, records.record.employeeId);
  await draft.amount.fill("135000.50");
  await draft.reason.fill("  \t   ");
  await chooseCurrency(page, "JPY");
  await expect(draft.amount).toHaveValue("");
  await expect(page.getByText(currentSalary, { exact: true })).toBeVisible();

  await draft.save.click();
  await expect(draft.amount).toHaveAttribute("aria-invalid", "true");
  await expect(draft.reason).toHaveAttribute("aria-invalid", "true");
  await expect(draft.reason).toHaveAccessibleDescription(/enter a reason for this change/iu);

  await draft.amount.fill("135000.50");
  await draft.save.click();
  await expect(draft.amount).toHaveValue("135000.50");
  await expect(draft.amount).toHaveAttribute("aria-invalid", "true");
  await expect(draft.amount).toHaveAccessibleDescription(/(?:no|0|zero) decimal places|whole (?:number|amount)/iu);
  await expect(draft.reason).toHaveValue("  \t   ");
  await expect(draft.currency).toHaveText(/^JPY\b/u);

  await draft.reason.fill(reasonForChange);
  await chooseCurrency(page, "USD");
  await expect(draft.amount).toHaveValue("");
  await expect(draft.reason).toHaveValue(reasonForChange);
  await draft.amount.fill("135000.50");
  await draft.save.click();
  await expect(page.getByRole("status").filter({ hasText: "Salary change saved" })).toBeVisible();
});

test("asks the manager to change the amount or currency when the salary is unchanged", async ({ page, records }) => {
  const draft = await startDraft(page, records.record.employeeId);
  await draft.amount.fill(records.record.annualBaseSalary);
  await draft.reason.fill(reasonForChange);
  await draft.save.click();

  await expect(page.getByText("Change the amount or currency before saving.", { exact: true })).toBeVisible();
  await expect(draft.amount).toHaveValue(records.record.annualBaseSalary);
  await expect(draft.reason).toHaveValue(reasonForChange);
  await expect(draft.save).toBeEnabled();
});

test("disables Save while pending and opens the updated record with one new history entry", async ({ page, records, hrSession }) => {
  const { employeeId } = records.record;
  const draft = await startDraft(page, employeeId);
  await chooseCurrency(page, "INR");
  await draft.amount.fill("132000.37");
  await draft.reason.fill(reasonForChange);
  const release = await holdRequest(page, saveRequest(employeeId));
  try {
    await draft.save.click();
    await expect(page.getByRole("button", { name: /saving salary change/iu })).toBeDisabled();
    await expect(page.getByText(currentSalary, { exact: true })).toBeVisible();
    await expect(page.getByText("Salary change saved", { exact: true })).toBeHidden();
  } finally {
    release();
  }

  await expect(page.getByRole("status").filter({ hasText: "Salary change saved" })).toBeVisible();
  await expectSavedRecord(page, employeeId, "INR 132,000.37", reasonForChange, hrSession.name);
  await page.reload();
  await expectSavedRecord(page, employeeId, "INR 132,000.37", reasonForChange, hrSession.name);
});

test("returns focus to the retained draft after a confirmed failure and can retry the same draft", async ({ page, records, hrSession }) => {
  const { employeeId } = records.record;
  const draft = await startDraft(page, employeeId);
  await draft.amount.fill("140000.25");
  await draft.reason.fill(reasonForChange);
  await page.route(saveRequest(employeeId), async (route) => {
    await route.fulfill({
      status: 500, json: { error: { code: "SALARY_SAVE_FAILED", message: saveFailureTitle } },
    });
  }, { times: 2 });

  await draft.save.click();
  const failure = page.getByRole("alertdialog", { name: saveFailureTitle, exact: true });
  await expect(failure).toBeVisible();
  await expect(draft.amount).toBeVisible();
  await expect(draft.amount).toHaveValue("140000.25");
  await expect(draft.reason).toHaveValue(reasonForChange);
  await failure.getByRole("button", { name: "Back to draft", exact: true }).click();
  await expect(failure).toBeHidden();
  await expect(draft.save).toBeFocused();
  await expect(draft.currency).toHaveText(/^USD\b/u);
  await expect(draft.amount).toHaveValue("140000.25");
  await expect(draft.reason).toHaveValue(reasonForChange);

  await draft.save.click();
  await failure.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(failure).toBeHidden();
  await expectSavedRecord(page, employeeId, "USD 140,000.25", reasonForChange, hrSession.name);
});

test("requires the second manager to review the winning salary and history before starting another change", async ({ browser, page, records, hrSession }) => {
  const { employeeId } = records.record;
  const firstDraft = await startDraft(page, employeeId);
  await withTestAccount(async ({ email, password }) => {
    const otherPage = await browser.newPage({ baseURL: new URL(page.url()).origin });
    try {
      await expect(await otherPage.request.post("/api/auth/sign-in/email", { data: { email, password } })).toBeOK();
      const staleDraft = await startDraft(otherPage, employeeId);
      await staleDraft.amount.fill("145000.00");
      await staleDraft.reason.fill("Second manager’s proposal");

      await firstDraft.amount.fill("138000.25");
      await firstDraft.reason.fill(reasonForChange);
      await firstDraft.save.click();
      await expectSavedRecord(page, employeeId, "USD 138,000.25", reasonForChange, hrSession.name);

      await staleDraft.save.click();
      const conflict = otherPage.getByRole("alertdialog", { name: "Another manager saved a change", exact: true });
      await expect(conflict).toHaveAccessibleDescription(/reload the record to review the latest salary/iu);
      await expect(staleDraft.amount).toHaveValue("145000.00");
      await expect(conflict.getByRole("button", { name: "Retry save", exact: true })).toBeHidden();
      await otherPage.keyboard.press("Escape");
      await expect(conflict).toBeVisible();
      await conflict.getByRole("button", { name: "Reload employee record", exact: true }).click();
      await expectSavedRecord(otherPage, employeeId, "USD 138,000.25", reasonForChange, hrSession.name);
      await otherPage.getByRole("button", { name: "Change salary", exact: true }).click();
      await expect(otherPage.getByText("USD 138,000.25", { exact: true })).toBeVisible();
      await expect(staleDraft.amount).toHaveValue("");
      await expect(staleDraft.reason).toHaveValue("");
    } finally {
      await otherPage.close();
    }
  }, "Second HR Manager");
});

test("requires a record reload when the response is lost after the server saves the change", async ({ page, records, hrSession }) => {
  const { employeeId } = records.record;
  const draft = await startDraft(page, employeeId);
  await draft.amount.fill("150000.75");
  await draft.reason.fill(reasonForChange);
  await page.route(saveRequest(employeeId), async (route) => {
    const saved = await route.fetch();
    await route.abort("connectionreset");
    await expect(saved).toBeOK();
  }, { times: 1 });

  await draft.save.click();
  const unknown = page.getByRole("alertdialog", { name: "We couldn’t confirm the save", exact: true });
  await expect(unknown).toHaveAccessibleDescription(/reload the record and check the current salary and history/iu);
  await expect(draft.amount).toHaveValue("150000.75");
  await expect(unknown.getByRole("button", { name: "Retry save", exact: true })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(unknown).toBeVisible();
  await unknown.getByRole("button", { name: "Reload employee record", exact: true }).click();
  await expectSavedRecord(page, employeeId, "USD 150,000.75", reasonForChange, hrSession.name);
});

test("returns to sign-in when the manager’s session expires before saving", async ({ page, records, hrSession }) => {
  const draft = await startDraft(page, records.record.employeeId);
  await draft.amount.fill("130000.00");
  await draft.reason.fill(reasonForChange);
  await hrSession.expire();
  await draft.save.click();

  await expect(page).toHaveURL((url) => url.pathname === "/sign-in");
  await expect(page.getByText("Your session expired", { exact: true })).toBeVisible();
  await expect(draft.heading).toBeHidden();
});
