import { expect, test, type Page } from "@playwright/test";

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";

async function api(page: Page, path: string, init: RequestInit = {}) {
  return page.evaluate(async ({ apiBase, path, init }) => {
    const raw = localStorage.getItem("esign.auth");
    const token = raw ? JSON.parse(raw)?.tokens?.accessToken : undefined;
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return { status: response.status, body: await response.json() };
  }, { apiBase, path, init });
}

test("UAT master data: inactive departments and positions stay out of user assignment dropdowns", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_EMAIL;
  const password = process.env.PLAYWRIGHT_PASSWORD;
  test.skip(!email || !password, "PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required for real UAT data");

  const suffix = Date.now().toString();
  const departmentName = `Inactive Department ${suffix}`;
  const positionName = `Inactive Position ${suffix}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);

  const department = await api(page, "/departments", {
    method: "POST",
    body: JSON.stringify({ name: departmentName, code: `ID${suffix.slice(-6)}` }),
  });
  expect(department.status).toBe(201);
  const departmentId = department.body.data.id as number;
  expect((await api(page, `/departments/${departmentId}`, { method: "PUT", body: JSON.stringify({ is_active: false }) })).status).toBe(200);

  const position = await api(page, "/positions", {
    method: "POST",
    body: JSON.stringify({ name: positionName, code: `IP${suffix.slice(-6)}`, level: 1 }),
  });
  expect(position.status).toBe(201);
  const positionId = position.body.data.position.id as number;
  expect((await api(page, `/positions/${positionId}`, { method: "PUT", body: JSON.stringify({ is_active: false }) })).status).toBe(200);

  await page.goto("/users");
  await page.getByRole("button", { name: /thêm người dùng/i }).click();
  await expect(page.locator(`#department_id option`, { hasText: departmentName })).toHaveCount(0);
  await expect(page.locator(`#position_id option`, { hasText: positionName })).toHaveCount(0);

  expect((await api(page, `/departments/${departmentId}`, { method: "DELETE" })).status).toBe(200);
  expect((await api(page, `/positions/${positionId}`, { method: "DELETE" })).status).toBe(200);
});
