import { expect, test } from "@playwright/test";

test("serves the built React app and the health API from the same origin", async ({ page }) => {
  const document = await page.goto("/");

  expect(document?.headers()["cache-control"]).toBe("no-cache");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(await page.request.get("/api/health/ready")).toBeOK();
});

test("serves the client for deep links and keeps API and asset misses distinct", async ({ request }) => {
  const document = await request.get("/example/deep-link", { headers: { Accept: "text/html" } });
  expect(document.status()).toBe(200);
  expect(document.headers()["content-type"]).toMatch(/text\/html/u);

  const missingApi = await request.get("/api/missing", { headers: { Accept: "text/html" } });
  expect(missingApi.status()).toBe(404);
  expect(missingApi.headers()["content-type"]).toMatch(/application\/json/u);

  const missingAsset = await request.get("/assets/missing.js");
  expect(missingAsset.status()).toBe(404);
});
