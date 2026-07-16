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
  const secondAdminEmail = `uat-tenant-b-${suffix}@example.test`;
  const secondTenantName = `UAT Tenant B ${suffix}`;
  const secondTenantDomain = `uat-b-${suffix}.example.test`;

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

  const department = await callApi(page, "/departments", {
    method: "POST",
    body: JSON.stringify({ name: `Private Department ${suffix}`, code: `TEN${suffix.slice(-6)}` }),
  });
  expect(department.status).toBe(201);
  const departmentId = department.body.data.id as number;

  const secondTenant = await page.request.post(`${apiBase}/tenants/create-with-admin`, {
    data: {
      tenant_name: secondTenantName,
      tenant_domain: secondTenantDomain,
      admin_email: secondAdminEmail,
      admin_password: password,
      admin_full_name: "UAT Tenant B Admin",
    },
  });
  expect(secondTenant.status()).toBe(201);

  const duplicateName = await callApi(page, "/tenants/me", {
    method: "PUT",
    body: JSON.stringify({ name: secondTenantName }),
  });
  expect(duplicateName.status).toBe(400);

  const secondContext = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  const secondPage = await secondContext.newPage();
  await signIn(secondPage, secondAdminEmail, password);
  await secondPage.goto("/departments");
  await expect(secondPage.getByRole("table")).not.toContainText(`Private Department ${suffix}`);
  const foreignDepartment = await callApi(secondPage, `/departments/${departmentId}`);
  expect(foreignDepartment.status).toBe(404);
  await secondContext.close();

  const isolated = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  const isolatedPage = await isolated.newPage();
  await isolatedPage.goto("/settings/tenant");
  await expect(isolatedPage).toHaveURL(/\/login$/);
  await isolated.close();
});
