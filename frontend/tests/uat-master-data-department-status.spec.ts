import { expect, test, type Page } from "@playwright/test";

const credentials = {
  email: process.env.PLAYWRIGHT_EMAIL,
  password: process.env.PLAYWRIGHT_PASSWORD,
};
const apiBase = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";

async function callApi(page: Page, path: string, init: RequestInit = {}) {
  return page.evaluate(async ({ apiBase, path, init }) => {
    const raw = window.localStorage.getItem("esign.auth");
    const accessToken = raw ? JSON.parse(raw)?.tokens?.accessToken : undefined;
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    return { status: response.status, body: await response.json() };
  }, { apiBase, path, init });
}

test("UAT master data: department can be disabled and re-enabled from the UI", async ({ page }) => {
  test.skip(!credentials.email || !credentials.password, "PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required for real UAT data");

  const suffix = Date.now().toString();
  const name = `UAT Department ${suffix}`;
  const code = `UAT${suffix.slice(-6)}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);

  const created = await callApi(page, "/departments", {
    method: "POST",
    body: JSON.stringify({ name, code, description: "UAT lifecycle record" }),
  });
  expect(created.status).toBe(201);
  const departmentId = created.body.data.id as number;

  const duplicate = await callApi(page, "/departments", {
    method: "POST",
    body: JSON.stringify({ name: `${name} duplicate`, code }),
  });
  expect(duplicate.status).toBe(400);

  await page.goto("/departments");
  await expect(page.getByRole("table").getByText(name)).toBeVisible();
  const actions = page.locator(`button[aria-label$="${name}"]`);
  await expect(actions).toHaveCount(3);
  await actions.nth(1).click();

  await expect.poll(async () => (await callApi(page, `/departments/${departmentId}`)).body.data.is_active).toBe(false);
  await page.screenshot({ path: "../docs/qa/evidence/uat-master-data-department-disabled.png", fullPage: true });

  await actions.nth(1).click();
  await expect.poll(async () => (await callApi(page, `/departments/${departmentId}`)).body.data.is_active).toBe(true);

  const deleted = await callApi(page, `/departments/${departmentId}`, { method: "DELETE" });
  expect(deleted.status).toBe(200);
  const missing = await callApi(page, `/departments/${departmentId}`);
  expect(missing.status).toBe(404);
});
