import { expect, test } from "@playwright/test";

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";

test("Documents: displays the document type returned by the list API", async ({ page, request }) => {
  const email = process.env.PLAYWRIGHT_EMAIL ?? "";
  const password = process.env.PLAYWRIGHT_PASSWORD ?? "";
  test.skip(!email || !password, "PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required");

  const login = await request.post(`${apiBase}/auth/login`, {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).data.tokens.accessToken as string;

  const response = await request.get(`${apiBase}/documents?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const document = (payload.data.documents as Array<{ document_type?: string | null }>).find(
    ({ document_type }) => typeof document_type === "string" && document_type.length > 0,
  );
  expect(document?.document_type).toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/documents");
  await expect(page.locator("tbody").getByText(document!.document_type!, { exact: true }).first()).toBeVisible();
});
