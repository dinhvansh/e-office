import { expect, test } from "@playwright/test";

const credentials = {
  email: process.env.PLAYWRIGHT_EMAIL ?? "admin@acme.local",
  password: process.env.PLAYWRIGHT_PASSWORD ?? "",
};

const protectedRoute = "/documents";

test("authenticated session persists before redirect and across protected-route navigation", async ({ page, context, browser }) => {
  test.skip(!credentials.password, "PLAYWRIGHT_PASSWORD is required for real UAT data");

  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.locator('button[type="submit"]').click();

  // Login redirects immediately. The durable local session must already exist.
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem("esign.auth");
    return raw ? Boolean(JSON.parse(raw)?.tokens?.accessToken) : false;
  })).toBe(true);

  await page.goto(protectedRoute);
  await expect(page).toHaveURL(new RegExp(`${protectedRoute}$`));
  await expect(page.locator("#file-upload-input")).toBeAttached();

  await page.reload();
  await expect(page).toHaveURL(new RegExp(`${protectedRoute}$`));
  await expect(page.locator("#file-upload-input")).toBeAttached();

  const newTab = await context.newPage();
  await newTab.goto(protectedRoute);
  await expect(newTab).toHaveURL(new RegExp(`${protectedRoute}$`));
  await expect(newTab.locator("#file-upload-input")).toBeAttached();
  await newTab.close();

  const isolatedContext = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  const isolatedPage = await isolatedContext.newPage();
  await isolatedPage.goto(protectedRoute);
  await expect(isolatedPage).toHaveURL(/\/login$/);
  await isolatedContext.close();
});
