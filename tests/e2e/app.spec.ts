import { expect, test } from "@playwright/test";

test("loads the built React app from Express and reaches the same-origin API", async ({ page }) => {
  const document = await page.goto("/");

  expect(document?.headers()["cache-control"]).toBe("no-cache");
  await expect(page.getByRole("heading", { name: "ACME Salary Management" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("API is connected.");
});

test("supports direct client navigation and keeps API and asset misses distinct", async ({ page, request }) => {
  const document = await page.goto("/example/deep-link");

  expect(document?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "ACME Salary Management" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("API is connected.");

  const missingApi = await request.get("/api/missing", { headers: { Accept: "text/html" } });
  expect(missingApi.status()).toBe(404);
  expect(missingApi.headers()["content-type"]).toMatch(/application\/json/u);

  const missingAsset = await request.get("/assets/missing.js");
  expect(missingAsset.status()).toBe(404);
});
