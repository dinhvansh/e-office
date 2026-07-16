import { expect, test, type Page } from "@playwright/test";

const credentials = { email: process.env.PLAYWRIGHT_EMAIL ?? "", password: process.env.PLAYWRIGHT_PASSWORD ?? "" };
const viewerCredentials = { email: process.env.PLAYWRIGHT_VIEWER_EMAIL ?? "viewer.matrix@acme.local", password: process.env.PLAYWRIGHT_ROLE_PASSWORD ?? "" };
const apiBase = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";

async function callApi(page: Page, path: string, init: RequestInit = {}) {
  return page.evaluate(async ({ apiBase, path, init }) => {
    const raw = localStorage.getItem("esign.auth");
    const token = raw ? JSON.parse(raw)?.tokens?.accessToken : undefined;
    const response = await fetch(`${apiBase}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
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

test("UAT workflow configuration: admin creates a workflow in UI and it persists", async ({ page }) => {
  test.skip(!credentials.email || !credentials.password, "PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required for real UAT data");
  const name = `UAT Workflow ${Date.now()}`;
  await signIn(page, credentials.email, credentials.password);
  await page.goto("/workflows");
  await page.getByRole("button", { name: "Tạo quy trình mới" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("VD: Phê duyệt hợp đồng").fill(name);
  await dialog.getByPlaceholder("Mô tả quy trình...").fill("UAT workflow configuration");
  await dialog.getByRole("button", { name: "Lưu" }).click();
  await expect(page.locator("tbody").getByText(name, { exact: true })).toBeVisible();

  const workflows = await callApi(page, "/workflows");
  expect(workflows.status).toBe(200);
  const workflow = workflows.body.data.workflows.find((item: { name: string }) => item.name === name);
  expect(workflow).toMatchObject({ name, description: "UAT workflow configuration", is_active: true, steps: [] });
  expect((await callApi(page, `/workflows/${workflow.id}`, { method: "DELETE" })).status).toBe(200);
});

test("UAT workflow RBAC: Viewer direct URL cannot create a workflow", async ({ page }) => {
  test.skip(!viewerCredentials.password, "PLAYWRIGHT_ROLE_PASSWORD is required for the seeded role persona");
  await signIn(page, viewerCredentials.email, viewerCredentials.password);
  await page.goto("/workflows");
  await expect(page).toHaveURL(/\/workflows$/);
  await expect(page.getByRole("button", { name: "Tạo quy trình mới" })).toHaveCount(0);
  const create = await callApi(page, "/workflows", { method: "POST", body: JSON.stringify({ name: `Viewer workflow ${Date.now()}` }) });
  expect(create.status).toBe(403);
});
