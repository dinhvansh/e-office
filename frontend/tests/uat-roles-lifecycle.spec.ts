import { expect, test, type Page } from "@playwright/test";

const credentials = {
  email: process.env.PLAYWRIGHT_EMAIL ?? "",
  password: process.env.PLAYWRIGHT_PASSWORD ?? "",
};
const apiBase = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";

async function callApi(page: Page, path: string, init: RequestInit = {}) {
  return page.evaluate(async ({ apiBase, path, init }) => {
    const raw = window.localStorage.getItem("esign.auth");
    const token = raw ? JSON.parse(raw)?.tokens?.accessToken : undefined;
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return { status: response.status, body: await response.json() };
  }, { apiBase, path, init });
}

test("UAT roles: admin creates a custom role in UI and its permissions persist", async ({ page }) => {
  test.skip(!credentials.email || !credentials.password, "PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required for real UAT data");

  const suffix = Date.now().toString();
  const name = `UAT Role ${suffix}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/roles");
  await page.getByRole("tab", { name: "Vai trò hệ thống" }).click();
  await page.getByRole("button", { name: "Tạo vai trò mới" }).click();
  await page.locator("#name").fill(name);
  await page.locator("#description").fill("UAT custom role lifecycle");
  await page.getByRole("dialog").getByRole("button", { name: "Tạo" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  const roles = await callApi(page, "/roles");
  expect(roles.status).toBe(200);
  const role = roles.body.data.find((item: { name: string }) => item.name === name);
  expect(role).toMatchObject({ name, description: "UAT custom role lifecycle", is_system: false });

  const duplicate = await callApi(page, "/roles", {
    method: "POST",
    body: JSON.stringify({ name, description: "Duplicate must be rejected" }),
  });
  expect(duplicate.status).toBe(400);

  const deleted = await callApi(page, `/roles/${role.id}`, { method: "DELETE" });
  expect(deleted.status).toBe(200);
  const missing = await callApi(page, `/roles/${role.id}`);
  expect(missing.status).toBe(404);
});
