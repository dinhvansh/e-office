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

test("UAT master data: external organization lifecycle rejects duplicate code and email", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_EMAIL ?? "";
  const password = process.env.PLAYWRIGHT_PASSWORD ?? "";
  test.skip(!email || !password, "PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required for real UAT data");

  const suffix = Date.now().toString();
  const name = `UAT Partner ${suffix}`;
  const code = `PARTNER-${suffix.slice(-6)}`;
  const contactEmail = `uat.partner.${suffix}@example.test`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);

  const created = await api(page, "/external-orgs", {
    method: "POST",
    body: JSON.stringify({ name, code, category: "partner", email: contactEmail, contact_person: "UAT Contact" }),
  });
  expect(created.status).toBe(201);
  const id = created.body.data.id as number;

  expect((await api(page, "/external-orgs", {
    method: "POST",
    body: JSON.stringify({ name: `${name} code duplicate`, code, email: `unique.${contactEmail}` }),
  })).status).toBe(400);

  const second = await api(page, "/external-orgs", {
    method: "POST",
    body: JSON.stringify({ name: `${name} second`, code: `${code}-SECOND`, email: `second.${contactEmail}` }),
  });
  expect(second.status).toBe(201);
  expect((await api(page, `/external-orgs/${second.body.data.id}`, {
    method: "PUT",
    body: JSON.stringify({ email: contactEmail }),
  })).status).toBe(400);
  expect((await api(page, `/external-orgs/${second.body.data.id}`, { method: "DELETE" })).status).toBe(200);
  expect((await api(page, "/external-orgs", {
    method: "POST",
    body: JSON.stringify({ name: `${name} email duplicate`, code: `${code}-EMAIL`, email: contactEmail }),
  })).status).toBe(400);

  expect((await api(page, `/external-orgs/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name: `${name} Updated`, is_active: false }),
  })).status).toBe(200);
  await expect.poll(async () => (await api(page, `/external-orgs/${id}`)).body.data.is_active).toBe(false);

  await page.goto("/external-orgs");
  await expect(page.getByRole("table").getByText(`${name} Updated`)).toBeVisible();
  expect((await api(page, `/external-orgs/${id}`, { method: "DELETE" })).status).toBe(200);
  expect((await api(page, `/external-orgs/${id}`)).status).toBe(404);
});
