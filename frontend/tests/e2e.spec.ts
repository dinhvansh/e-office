import { expect, request as playwrightRequest, test } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:4000/api/v1";
const creds = {
  email: process.env.PLAYWRIGHT_EMAIL ?? "admin@acme.local",
  password: process.env.PLAYWRIGHT_PASSWORD ?? "secret123",
};

async function authenticate(api = playwrightRequest) {
  const response = await api.post(`${API_BASE}/auth/login`, {
    data: {
      email: creds.email,
      password: creds.password,
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  return {
    token: json.data.tokens.accessToken as string,
    tenant: json.data.tenant,
  };
}

test.describe("WP Sign smoke suite", () => {
  test("user can log in via UI and reach dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(creds.email);
    await page.getByLabel("Mật khẩu").fill(creds.password);
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    await expect(page.getByText("Tài liệu gần đây")).toBeVisible();
    await expect(page.getByText("Upload PDF mới")).toBeVisible();
  });

  test("API can upload a document and create sign request", async ({ request }) => {
    const { token } = await authenticate(request);
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const fileName = `playwright-${Date.now()}.txt`;
    const fileBase64 = Buffer.from(`Playwright smoke ${new Date().toISOString()}`).toString("base64");

    const uploadResponse = await request.post(`${API_BASE}/documents`, {
      headers: authHeaders,
      data: { file_name: fileName, file_base64: fileBase64 },
    });
    expect(uploadResponse.ok()).toBeTruthy();
    const uploadJson = await uploadResponse.json();
    const documentId = uploadJson.data.document.id as number;

    const signRequestPayload = {
      document_id: documentId,
      title: `Playwright SR ${Date.now()}`,
      message: "Automation smoke",
      workflow_type: "sequential",
      signers: [{ email: "qa@example.com", name: "QA Bot" }],
    };
    const signRequestResponse = await request.post(`${API_BASE}/sign-requests`, {
      headers: authHeaders,
      data: signRequestPayload,
    });
    expect(signRequestResponse.ok()).toBeTruthy();
    const srJson = await signRequestResponse.json();
    expect(srJson.data.sign_request.document_id).toBe(documentId);
    expect(srJson.data.sign_request.signers.length).toBeGreaterThan(0);
  });
});
