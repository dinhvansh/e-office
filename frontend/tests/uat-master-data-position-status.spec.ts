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

test("UAT master data: position can be disabled and re-enabled from the UI", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_EMAIL ?? "";
  const password = process.env.PLAYWRIGHT_PASSWORD ?? "";
  test.skip(!email || !password, "PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required for real UAT data");

  const suffix = Date.now().toString();
  const name = `UAT Position ${suffix}`;
  const code = `UAT${suffix.slice(-6)}`;
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);

  const created = await api(page, "/positions", { method: "POST", body: JSON.stringify({ name, code, level: 1 }) });
  expect(created.status).toBe(201);
  const id = created.body.data.position.id as number;
  const duplicate = await api(page, "/positions", { method: "POST", body: JSON.stringify({ name: `${name} duplicate`, code, level: 1 }) });
  expect(duplicate.status).toBe(400);

  await page.goto("/positions");
  await expect(page.getByRole("table").getByText(name)).toBeVisible();
  const actions = page.locator(`button[aria-label$="${name}"]`);
  await expect(actions).toHaveCount(3);
  await actions.nth(1).click();
  await expect.poll(async () => (await api(page, `/positions/${id}`)).body.data.position.is_active).toBe(false);
  await actions.nth(1).click();
  await expect.poll(async () => (await api(page, `/positions/${id}`)).body.data.position.is_active).toBe(true);
  expect((await api(page, `/positions/${id}`, { method: "DELETE" })).status).toBe(200);
});
