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

test("UAT ACL: non-owner cannot grant document permissions", async ({ page, browser }) => {
  const password = process.env.PLAYWRIGHT_ROLE_PASSWORD ?? "";
  test.skip(!password, "PLAYWRIGHT_ROLE_PASSWORD is required");
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.PLAYWRIGHT_EMAIL ?? "");
  await page.locator('input[type="password"]').fill(process.env.PLAYWRIGHT_PASSWORD ?? "");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
  const document = await api(page, "/documents", { method: "POST", body: JSON.stringify({ file_name: `acl-${Date.now()}.txt`, file_base64: Buffer.from("acl").toString("base64") }) });
  expect(document.status).toBe(201);
  const id = document.body.data.document.id as number;
  const viewerContext = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  const viewer = await viewerContext.newPage();
  await viewer.goto("/login");
  await viewer.getByLabel("Email").fill(process.env.PLAYWRIGHT_VIEWER_EMAIL ?? "viewer.matrix@acme.local");
  await viewer.locator('input[type="password"]').fill(password);
  await viewer.locator('button[type="submit"]').click();
  await expect(viewer).toHaveURL(/\/$/);
  const grant = await api(viewer, `/documents/${id}/permissions`, { method: "POST", body: JSON.stringify({ permission_source: "share", subject_type: "user", subject_id: 1, can_read: true }) });
  expect(grant.status).toBe(403);
  await viewerContext.close();
});
