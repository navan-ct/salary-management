import { randomUUID } from "node:crypto";

import { type Page, expect, test } from "@playwright/test";

import { expireAuthSessions, fixturePassword, withTestAccount } from "../helpers/auth-account.js";

const directory = "/employees";
const signInPath = "/sign-in";

async function expectSignIn(page: Page) {
  await expect(page).toHaveURL((url) => url.pathname === signInPath);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByLabel("Work email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
}

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Work email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function expectDirectory(page: Page) {
  await expect(page).toHaveURL((url) => url.pathname === directory);
  await expect(page.getByRole("heading", { name: "Employee directory", exact: true })).toBeVisible();
}

for (const [name, path] of [
  ["the employee directory", directory],
  ["an employee salary record and history", "/employees/AC-00001"],
  ["pay insights", "/insights"],
] as const) {
  test(`requires sign-in before opening ${name}`, async ({ page }) => {
    await page.goto(path);

    await expectSignIn(page);
    await expect(page.getByText("For authorized ACME HR managers.", { exact: true })).toBeVisible();
  });
}

test("rejects an unprovisioned work email and allows retry with a provisioned account", async ({ page }) => {
  await page.goto(signInPath);
  await expectSignIn(page);

  const email = `unprovisioned-${randomUUID()}@acme.com`;
  await signIn(page, email, fixturePassword);

  await expect(page.getByRole("alert")).toContainText(/invalid email or password/iu);
  await expectSignIn(page);
  await expect(page.getByLabel("Work email", { exact: true })).toHaveValue(email);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();

  await withTestAccount(async (account) => {
    await signIn(page, account.email, account.password);
    await expectDirectory(page);
  });
});

test("keeps the session on reload and returns to sign-in after sign-out", async ({ page }) => {
  await page.goto("/");
  await expectSignIn(page);

  await withTestAccount(async ({ email, password }) => {
    await signIn(page, email, password);
    await expectDirectory(page);

    await page.reload();
    await expectDirectory(page);

    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expectSignIn(page);

    await page.goto(directory);
    await expectSignIn(page);
    await expect(page.getByRole("heading", { name: "Employee directory", exact: true })).toBeHidden();
  });
});

test("returns to sign-in with the expired-session notice and allows sign-in again", async ({ page }) => {
  await page.goto(directory);
  await expectSignIn(page);

  await withTestAccount(async ({ id, email, password }, db) => {
    await signIn(page, email, password);
    await expectDirectory(page);

    expect(await expireAuthSessions(db, id)).toBe(1);
    await page.reload();

    await expectSignIn(page);
    await expect(page.getByText("Your session expired", { exact: true })).toBeVisible();
    await expect(page.getByText("Sign in again to access salary data.", { exact: true })).toBeVisible();

    await signIn(page, email, password);
    await expectDirectory(page);
  });
});
