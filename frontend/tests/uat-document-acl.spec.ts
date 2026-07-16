import { expect, test, type Page } from "@playwright/test";

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";

async function api(page: Page, path: string, init: RequestInit = {}) {
  return page.evaluate(async ({ apiBase, path, init }) => {
    const raw = localStorage.getItem("esign.auth");
    const token = raw ? JSON.parse(raw)?.tokens?.accessToken : undefined;
    const response = await fetch(`${apiBase}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    return { status: response.status, body: await response.json() };
  }, { apiBase, path, init });
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}

test("UAT ACL: non-owner cannot grant document permissions", async ({ page, browser }) => {
  const password = process.env.PLAYWRIGHT_ROLE_PASSWORD ?? "";
  test.skip(!password, "PLAYWRIGHT_ROLE_PASSWORD is required");
  await signIn(page, process.env.PLAYWRIGHT_EMAIL ?? "", process.env.PLAYWRIGHT_PASSWORD ?? "");
  const document = await api(page, "/documents", { method: "POST", body: JSON.stringify({ file_name: `acl-${Date.now()}.txt`, file_base64: Buffer.from("acl").toString("base64") }) });
  expect(document.status).toBe(201);
  const id = document.body.data.document.id as number;
  const users = await api(page, "/users?search=viewer.matrix%40acme.local");
  const viewerUser = users.body.data.find((item: { email: string }) => item.email === "viewer.matrix@acme.local");
  expect(viewerUser).toBeTruthy();
  const permissionPayload = { permission_source: "share", subject_type: "user", subject_id: viewerUser.id, can_read: true };
  const viewerContext = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  const viewer = await viewerContext.newPage();
  await signIn(viewer, process.env.PLAYWRIGHT_VIEWER_EMAIL ?? "viewer.matrix@acme.local", password);
  const grant = await api(viewer, `/documents/${id}/permissions`, { method: "POST", body: JSON.stringify(permissionPayload) });
  expect(grant.status).toBe(403);
  await viewerContext.close();
});

test("UAT ACL: tenant admin cannot modify a foreign document ACL", async ({ page, browser }) => {
  const suffix = Date.now().toString();
  const password = `AclTenant${suffix.slice(-4)}A1`;
  const ownerEmail = `acl-owner-${suffix}@example.test`;
  const otherAdminEmail = `acl-other-${suffix}@example.test`;

  for (const [name, domain, email] of [
    [`ACL Owner ${suffix}`, `acl-owner-${suffix}.example.test`, ownerEmail],
    [`ACL Other ${suffix}`, `acl-other-${suffix}.example.test`, otherAdminEmail],
  ]) {
    const created = await page.request.post(`${apiBase}/tenants/create-with-admin`, {
      data: { tenant_name: name, tenant_domain: domain, admin_email: email, admin_password: password, admin_full_name: "ACL UAT Admin" },
    });
    expect(created.status()).toBe(201);
  }

  await signIn(page, ownerEmail, password);
  const document = await api(page, "/documents", {
    method: "POST",
    body: JSON.stringify({ file_name: `foreign-acl-${suffix}.txt`, file_base64: Buffer.from("acl").toString("base64") }),
  });
  expect(document.status).toBe(201);
  const documentId = document.body.data.document.id as number;

  const otherContext = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  const otherAdmin = await otherContext.newPage();
  await signIn(otherAdmin, otherAdminEmail, password);
  const grant = await api(otherAdmin, `/documents/${documentId}/permissions`, {
    method: "POST",
    body: JSON.stringify({ permission_source: "share", subject_type: "user", subject_id: 1, can_read: true }),
  });
  expect(grant.status).toBe(403);
  await otherContext.close();
});
