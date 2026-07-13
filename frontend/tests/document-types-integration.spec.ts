import { expect, type APIRequestContext, test } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";
const creds = {
  email: process.env.PLAYWRIGHT_EMAIL ?? "admin@acme.local",
  password: process.env.PLAYWRIGHT_PASSWORD ?? "secret123",
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

test.describe("Document Types + Numbering Integration", () => {
  test("UI: Document types dropdown loads and displays correctly", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.getByLabel("Email").fill(creds.email);
    await page.getByLabel("Mật khẩu").fill(creds.password);
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    
    // Wait for login to complete and navigate to documents
    await page.waitForURL(/\/(dashboard)?/, { timeout: 10000 });
    
    // Navigate to documents page
    await page.goto("/documents");
    await page.waitForLoadState('networkidle');
    
    // Check if document type dropdown exists
    const dropdown = page.locator('select').first();
    await expect(dropdown).toBeVisible();
    
    // Check if dropdown has options (should have at least 8 document types + placeholder)
    const options = await dropdown.locator('option').count();
    expect(options).toBeGreaterThan(8); // 8 types + 1 placeholder
    
    // Verify placeholder text
    const firstOption = dropdown.locator('option').first();
    await expect(firstOption).toHaveText(/Chọn loại văn bản/i);
  });

  test("UI: Upload document with document type shows document number", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.getByLabel("Email").fill(creds.email);
    await page.getByLabel("Mật khẩu").fill(creds.password);
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    
    // Wait for login to complete and navigate to documents
    await page.waitForURL(/\/(dashboard)?/, { timeout: 10000 });
    
    // Navigate to documents page
    await page.goto("/documents");
    await page.waitForLoadState('networkidle');
    
    // Select document type (first real option, skip placeholder)
    const dropdown = page.locator('select').first();
    await dropdown.selectOption({ index: 1 }); // Select first document type
    
    // Fill file name
    await page.getByPlaceholder(/Hợp đồng đối tác/i).fill('Test Document from Playwright');
    
    // Upload file (create a simple PDF base64)
    const pdfBase64 = "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCAzMwo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDEzNiAwMDAwMCBuCjAwMDAwMDAxOTYgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjI3OAolJUVPRg==";
    
    // Create a file from base64
    const buffer = Buffer.from(pdfBase64, 'base64');
    const file = new File([buffer], 'test.pdf', { type: 'application/pdf' });
    
    // Set file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: buffer,
    });
    
    // Click upload button
    await page.getByRole('button', { name: /Tải tài liệu/i }).click();
    
    // Wait for upload to complete (button text changes)
    await expect(page.getByRole('button', { name: /Tải tài liệu/i })).toBeVisible({ timeout: 10000 });
    
    // Check if document appears in table with document number
    // The document number should be in format like "001/2025" or similar
    await expect(page.locator('table')).toBeVisible();
    
    // Look for document number column (should show a number, not "—")
    const documentNumberCell = page.locator('td').filter({ hasText: /\d{3}\/\d{4}/ }).first();
    await expect(documentNumberCell).toBeVisible({ timeout: 5000 });
  });

  test("API: Upload with document_type_id generates document number", async ({ request }) => {
    const { token } = await authenticate(request);
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Get document types first
    const typesResponse = await request.get(`${API_BASE}/document-types`, {
      headers: authHeaders,
    });
    expect(typesResponse.ok()).toBeTruthy();
    const typesJson = await typesResponse.json();
    const documentTypes = typesJson.data;
    expect(documentTypes.length).toBeGreaterThan(0);

    // Find a document type with numbering
    const typeWithNumbering = documentTypes.find(
      (documentType: { require_numbering: boolean }) => documentType.require_numbering,
    );
    expect(typeWithNumbering).toBeDefined();

    // Upload document with document_type_id
    const fileName = `playwright-typed-${Date.now()}.pdf`;
    const fileBase64 = "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCAzMwo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDEzNiAwMDAwMCBuCjAwMDAwMDAxOTYgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjI3OAolJUVPRg==";

    const uploadResponse = await request.post(`${API_BASE}/documents`, {
      headers: authHeaders,
      data: {
        file_name: fileName,
        file_base64: fileBase64,
        document_type_id: typeWithNumbering.id,
      },
    });
    expect(uploadResponse.ok()).toBeTruthy();
    const uploadJson = await uploadResponse.json();
    const document = uploadJson.data.document;

    // Verify document has type and number
    expect(document.document_type_id).toBe(typeWithNumbering.id);
    expect(document.document_number).toBeTruthy();
    expect(document.document_number).toMatch(/\d{3}\/\d{4}/); // Format: 001/2025
    expect(document.numbering_rule_id).toBeTruthy();

    console.log(`✅ Document created with number: ${document.document_number}`);
  });

  test("API: Upload multiple documents increments counter", async ({ request }) => {
    const { token } = await authenticate(request);
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Get document types
    const typesResponse = await request.get(`${API_BASE}/document-types`, {
      headers: authHeaders,
    });
    const typesJson = await typesResponse.json();
    const typeWithNumbering = typesJson.data.find(
      (documentType: { require_numbering: boolean }) => documentType.require_numbering,
    );

    const fileBase64 = "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCAzMwo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDEzNiAwMDAwMCBuCjAwMDAwMDAxOTYgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjI3OAolJUVPRg==";

    // Upload first document
    const upload1 = await request.post(`${API_BASE}/documents`, {
      headers: authHeaders,
      data: {
        file_name: `test-1-${Date.now()}.pdf`,
        file_base64: fileBase64,
        document_type_id: typeWithNumbering.id,
      },
    });
    const doc1 = (await upload1.json()).data.document;

    // Upload second document
    const upload2 = await request.post(`${API_BASE}/documents`, {
      headers: authHeaders,
      data: {
        file_name: `test-2-${Date.now()}.pdf`,
        file_base64: fileBase64,
        document_type_id: typeWithNumbering.id,
      },
    });
    const doc2 = (await upload2.json()).data.document;

    // Extract numbers from document_number (e.g., "001/2025" -> 1)
    const num1 = parseInt(doc1.document_number.split('/')[0]);
    const num2 = parseInt(doc2.document_number.split('/')[0]);

    // Verify second number is greater than first
    expect(num2).toBeGreaterThan(num1);
    console.log(`✅ Counter incremented: ${doc1.document_number} -> ${doc2.document_number}`);
  });
});
