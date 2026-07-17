import { expect, type APIRequestContext, test } from "@playwright/test";

// Require environment variables - no fallback to localhost
if (!process.env.PLAYWRIGHT_API_BASE_URL) {
  throw new Error('PLAYWRIGHT_API_BASE_URL environment variable is required');
}
if (!process.env.PLAYWRIGHT_EMAIL) {
  throw new Error('PLAYWRIGHT_EMAIL environment variable is required');
}
if (!process.env.PLAYWRIGHT_PASSWORD) {
  throw new Error('PLAYWRIGHT_PASSWORD environment variable is required');
}

const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL;
const creds = {
  email: process.env.PLAYWRIGHT_EMAIL,
  password: process.env.PLAYWRIGHT_PASSWORD,
};

async function authenticate(api: APIRequestContext) {
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
    await expect(page.locator('a[href="/documents"]').first()).toBeVisible();
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

  test("external signer can open the issued link and verify the emailed OTP", async ({ page, request }) => {
    const { token } = await authenticate(request);
    const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const marker = `external-otp-${Date.now()}`;
    const email = `${marker}@example.test`;
    const upload = await request.post(`${API_BASE}/documents`, {
      headers: authHeaders,
      data: { file_name: `${marker}.pdf`, file_base64: "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAwIG4NCjAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAwIG4NCnRyYWlsZXI8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0YK" },
    });
    expect(upload.ok()).toBeTruthy();
    const documentId = (await upload.json()).data.document.id as number;
    const created = await request.post(`${API_BASE}/sign-requests`, {
      headers: authHeaders,
      data: { document_id: documentId, title: marker, workflow_type: "sequential", signers: [{ email, name: "External OTP UAT" }] },
    });
    expect(created.ok()).toBeTruthy();
    const signRequestId = (await created.json()).data.sign_request.id as number;
    const sent = await request.post(`${API_BASE}/sign-requests/${signRequestId}/send`, { headers: authHeaders });
    expect(sent.ok()).toBeTruthy();
    const sentData = await sent.json();
    const signer = sentData.data.sign_request.signers.find((candidate: { email: string }) => candidate.email === email);
    expect(signer?.signing_token).toMatch(/^[a-f0-9]{64}$/);

    await page.goto(`/sign/${signer.signing_token}`);
    await expect(page.getByRole("heading", { name: marker })).toBeVisible();
    const messages = await request.get("http://127.0.0.1:8025/api/v1/messages");
    expect(messages.ok()).toBeTruthy();
    const message = (await messages.json()).messages.find((candidate: { To: Array<{ Address: string }> }) => candidate.To.some((to) => to.Address === email));
    expect(message).toBeTruthy();
    const content = await request.get(`http://127.0.0.1:8025/api/v1/message/${message.ID}`);
    const otp = (JSON.stringify(await content.json()).match(/\b\d{6}\b/) || [])[0];
    expect(otp).toMatch(/^\d{6}$/);
    if (!otp) throw new Error("Expected a six-digit OTP in email content");
    await page.getByLabel(/Mã OTP/).fill(otp);
    await page.getByRole("button", { name: /Xác thực OTP/ }).click();
    await expect(page.locator("p.text-green-900", { hasText: "Xác thực thành công" })).toBeVisible();
    const signing = await page.evaluate(async ({ signingToken, oneTimePassword }) => {
      const response = await fetch(`http://127.0.0.1:4010/public/sign/${signingToken}/sign`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: oneTimePassword,
          signature_data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          signature_type: "drawn",
          field_values: [],
        }),
      });
      return { status: response.status, body: await response.json() };
    }, { signingToken: signer.signing_token, oneTimePassword: otp });
    expect(signing.status).toBe(200);
    await expect.poll(async () => {
      const status = await request.get(`${API_BASE}/sign-requests/${signRequestId}`, { headers: authHeaders });
      return (await status.json()).data.sign_request.status;
    }, { timeout: 30_000 }).toBe("completed");
    const artifact = await request.get(`http://127.0.0.1:4010/public/sign/${signer.signing_token}/download-signed`);
    expect(artifact.ok()).toBeTruthy();
  });
});
