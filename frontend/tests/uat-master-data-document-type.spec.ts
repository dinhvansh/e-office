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

test("UAT master data: document type lifecycle persists workflow mapping and inactive state", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_EMAIL;
  const password = process.env.PLAYWRIGHT_PASSWORD;
  test.skip(!email || !password, "PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required for real UAT data");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);

  const workflows = await api(page, "/workflows");
  expect(workflows.status).toBe(200);
  const workflow = (workflows.body.data.workflows ?? workflows.body.data)[0];
  expect(workflow?.id).toBeTruthy();

  const suffix = Date.now().toString();
  const code = `UATDT${suffix.slice(-6)}`;
  const name = `UAT Document Type ${suffix}`;
  const created = await api(page, "/document-types", {
    method: "POST",
    body: JSON.stringify({
      code,
      name,
      require_numbering: true,
      numbering_pattern: "UAT-{SEQ}/{YEAR}",
      require_approval: true,
      default_workflow_id: workflow.id,
      allow_workflow_override: false,
    }),
  });
  expect(created.status).toBe(201);
  const id = created.body.data.id as number;
  expect(created.body.data.default_workflow_id).toBe(workflow.id);

  expect((await api(page, "/document-types", {
    method: "POST",
    body: JSON.stringify({ code, name: `${name} duplicate` }),
  })).status).toBe(400);

  await page.goto("/document-types");
  await expect(page.getByText(name)).toBeVisible();

  const deactivated = await api(page, `/document-types/${id}`, {
    method: "PUT",
    body: JSON.stringify({ is_active: false }),
  });
  expect(deactivated.status).toBe(200);
  expect(deactivated.body.data.is_active).toBe(false);
  expect(deactivated.body.data.default_workflow_id).toBe(workflow.id);

  const activeTypes = await api(page, "/document-types?is_active=true");
  expect(activeTypes.status).toBe(200);
  expect((activeTypes.body.data as Array<{ id: number }>).some((type) => type.id === id)).toBe(false);

  await page.goto("/documents");
  await page.locator("#file-upload-input").setInputFiles({
    name: "inactive-document-type.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await page.getByRole("button", { name: /chọn loại văn bản/i }).click();
  await expect(page.locator('[role="listbox"] [role="option"]', { hasText: name })).toHaveCount(0);

  expect((await api(page, `/document-types/${id}`, { method: "DELETE" })).status).toBe(200);
  expect((await api(page, `/document-types/${id}`)).status).toBe(404);
});
