import { expect, test, type APIRequestContext } from '@playwright/test';

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL;
const email = process.env.PLAYWRIGHT_EMAIL;
const password = process.env.PLAYWRIGHT_PASSWORD;
const validPdf = 'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAwIG4NCjAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0YK';

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function api(request: APIRequestContext, path: string, token: string, data?: unknown) {
  const response = await request.fetch(`${apiBase}${path}`, { method: data ? 'POST' : 'GET', data, headers: headers(token) });
  return { response, body: await response.json() };
}

test.describe('Sign-request replacement draft', () => {
  test.skip(!apiBase || !email || !password, 'UAT credentials are required');

  test('cancelling a sent request preserves it and opens a clean replacement draft', async ({ page, request }) => {
    const login = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).data.tokens.accessToken as string;
    const me = (await api(request, '/auth/me', token)).body.data.user as { email: string; full_name?: string };
    const types = (await api(request, '/document-types?purpose=create', token)).body.data as Array<{ id: number; require_approval: boolean }>;
    const typeId = types.find((item) => !item.require_approval)?.id;
    expect(typeId).toBeTruthy();

    const document = await api(request, '/documents', token, {
      title: `Replacement draft ${Date.now()}`,
      document_type_id: typeId,
      file_name: 'replacement-draft.pdf',
      file_base64: validPdf,
      mime_type: 'application/pdf',
    });
    expect(document.response.ok()).toBeTruthy();
    const documentId = document.body.data.document.id as number;
    const created = await api(request, '/sign-requests', token, {
      document_id: documentId,
      title: `Replacement draft ${Date.now()}`,
      workflow_type: 'sequential',
      signers: [{ email: me.email, name: me.full_name || me.email, role: 'signer', signing_order: 1 }],
    });
    expect(created.response.ok()).toBeTruthy();
    const signRequestId = created.body.data.sign_request.id as number;
    expect((await api(request, `/sign-requests/${signRequestId}/send`, token, {})).response.ok()).toBeTruthy();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto(`/sign-requests/${signRequestId}/editor`);
    await page.getByRole('button', { name: 'Hủy luồng & tạo lại' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Hủy luồng và tạo lại' }).click();
    await expect(page).toHaveURL(new RegExp(`/sign-requests/create\\?replaces=${signRequestId}`));
    await expect(page.getByText(`Luồng #${signRequestId} đã được hủy`)).toBeVisible();

    const cancelled = await api(request, `/sign-requests/${signRequestId}`, token);
    expect(cancelled.body.data.sign_request.status).toBe('cancelled');
  });

  test('a draft field can be removed from the PDF with the visible delete control', async ({ page, request }) => {
    const login = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).data.tokens.accessToken as string;
    const me = (await api(request, '/auth/me', token)).body.data.user as { email: string; full_name?: string };
    const types = (await api(request, '/document-types?purpose=create', token)).body.data as Array<{ id: number; require_approval: boolean }>;
    const typeId = types.find((item) => !item.require_approval)?.id;
    const document = await api(request, '/documents', token, {
      title: `Field delete ${Date.now()}`,
      document_type_id: typeId,
      file_name: 'field-delete.pdf',
      file_base64: validPdf,
      mime_type: 'application/pdf',
    });
    expect(document.response.ok()).toBeTruthy();
    const created = await api(request, '/sign-requests', token, {
      document_id: document.body.data.document.id,
      title: `Field delete ${Date.now()}`,
      workflow_type: 'sequential',
      signers: [{ email: me.email, name: me.full_name || me.email, role: 'signer', signing_order: 1 }],
    });
    expect(created.response.ok()).toBeTruthy();
    const signRequestId = created.body.data.sign_request.id as number;

    await page.goto('/login');
    await page.getByLabel('Email').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto(`/sign-requests/create?signRequestId=${signRequestId}`);
    await expect(page.getByRole('heading', { name: /Người ký ngoài và thông tin bổ sung/ })).toBeVisible();
    await page.getByRole('button', { name: /Tài liệu/ }).click();
    await page.getByRole('button', { name: /Người tham gia/ }).click();
    await expect(page.getByRole('heading', { name: /Người ký ngoài và thông tin bổ sung/ })).toBeVisible();
    await page.goto(`/sign-requests/${signRequestId}/editor`);
    await expect(page.getByText('Page 1 / 1')).toBeVisible();
    await page.locator('canvas').click({ position: { x: 180, y: 180 }, force: true });
    await expect(page.getByRole('heading', { name: 'Vị trí đã đặt (1)' })).toBeVisible();
    const deleteControl = page.getByTitle('Xóa vị trí ký');
    await deleteControl.hover();
    await deleteControl.click();
    await expect(page.getByRole('heading', { name: 'Vị trí đã đặt (0)' })).toBeVisible();

    await page.locator('canvas').click({ position: { x: 180, y: 180 }, force: true });
    await expect(page.locator('[data-sign-field-id="field-0"]')).toBeVisible();
    await page.locator('[data-sign-field-id="field-0"]').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Delete');
    await expect(page.getByRole('heading', { name: 'Vị trí đã đặt (0)' })).toBeVisible();
  });
});
