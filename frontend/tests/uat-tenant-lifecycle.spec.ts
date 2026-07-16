import { expect, test, type Page } from "@playwright/test";

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}

async function callApi(page: Page, path: string, init: RequestInit = {}) {
  return page.evaluate(async ({ apiBase, path, init }) => {
    const raw = window.localStorage.getItem("esign.auth");
    const accessToken = raw ? JSON.parse(raw)?.tokens?.accessToken : undefined;
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
    return { status: response.status, body: await response.json() };
  }, { apiBase, path, init });
}

test("UAT tenant lifecycle: onboarding admin can update only its own company profile", async ({ page, browser }) => {
  const suffix = Date.now().toString();
  const password = `UatTenant${suffix.slice(-4)}A1`;
  const adminEmail = `uat-tenant-${suffix}@example.test`;
  const initialName = `UAT Tenant ${suffix}`;
  const initialDomain = `uat-${suffix}.example.test`;
  const updatedName = `${initialName} Updated`;
  const updatedDomain = `updated-${suffix}.example.test`;

  const created = await page.request.post(`${apiBase}/tenants/create-with-admin`, {
    data: {
      tenant_name: initialName,
      tenant_domain: initialDomain,
      admin_email: adminEmail,
      admin_password: password,
      admin_full_name: "UAT Tenant Admin",
    },
  });
  expect(created.status()).toBe(201);
  expect((await created.json()).data.tenant.name).toBe(initialName);

  const duplicate = await page.request.post(`${apiBase}/tenants/create-with-admin`, {
    data: {
      tenant_name: initialName,
      tenant_domain: `duplicate-${initialDomain}`,
      admin_email: `duplicate-${adminEmail}`,
      admin_password: password,
      admin_full_name: "Duplicate Tenant Admin",
    },
  });
  expect(duplicate.status()).toBe(400);

  await signIn(page, adminEmail, password);
  await page.goto("/settings/tenant");
  await expect(page.getByRole("heading", { name: initialName, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Chỉnh sửa" }).click();
  await page.locator("#name").fill(updatedName);
  await page.locator("#domain").fill(updatedDomain);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("heading", { name: updatedName, exact: true })).toBeVisible();
  await expect(page.getByText(updatedDomain, { exact: true })).toBeVisible();

  const profile = await callApi(page, "/tenants/me");
  expect(profile.status).toBe(200);
  expect(profile.body.data.tenant).toMatchObject({ name: updatedName, domain: updatedDomain });

  const isolated = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  const isolatedPage = await isolated.newPage();
  await isolatedPage.goto("/settings/tenant");
  await expect(isolatedPage).toHaveURL(/\/login$/);
  await isolated.close();
});
