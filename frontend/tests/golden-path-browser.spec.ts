import { expect, test, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL;
const adminEmail = process.env.PLAYWRIGHT_EMAIL;
const password = process.env.PLAYWRIGHT_PASSWORD;
const peerEmail = process.env.PLAYWRIGHT_WORKFLOW_PEER_EMAIL ?? 'workflow-peer@acme.local';
const viewerEmail = process.env.PLAYWRIGHT_VIEWER_EMAIL ?? 'viewer.matrix@acme.local';
const pdf = 'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAwIG4NCjAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0YK';

const validPdf = 'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAwIG4NCjAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0YK';
function headers(token: string) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }
async function token(request: APIRequestContext, email: string) {
  const response = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.tokens.accessToken as string;
}
async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('input[type="password"]').fill(password!);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);
}
async function browserFor(browser: Browser, email: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await login(page, email);
  return { context, page };
}
async function api(request: APIRequestContext, path: string, init: { method?: string; data?: unknown; token: string }) {
  const response = await request.fetch(`${apiBase}${path}`, { method: init.method, data: init.data, headers: headers(init.token) });
  const body = (response.headers()['content-type'] ?? '').includes('application/json') ? await response.json() : null;
  return { response, body };
}
async function configureAndCreate(request: APIRequestContext, label: string, approvalUsers: number[], signerUsers: Array<{ id: number; email: string; name: string }>) {
  const adminToken = await token(request, adminEmail!);
  const me = (await api(request, '/auth/me', { token: adminToken })).body.data.user;
  const workflow = await api(request, '/workflows', { method: 'POST', token: adminToken, data: { name: `${label} workflow`, description: 'Golden Path browser evidence' } });
  expect(workflow.response.ok()).toBeTruthy();
  const workflowId = workflow.body.data.workflow.id as number;
  for (const [index, userId] of approvalUsers.entries()) {
    const step = await api(request, `/workflows/${workflowId}/steps`, { method: 'POST', token: adminToken, data: { step_name: `${label} approval ${index + 1}`, assignee_type: 'specific_user', assignee_user_id: userId, completion_mode: 'all', participant_role: 'approver' } });
    expect(step.response.ok()).toBeTruthy();
  }
  const type = await api(request, '/document-types', { method: 'POST', token: adminToken, data: { code: `GP${Date.now().toString().slice(-7)}`, name: `${label} type`, require_numbering: true, numbering_pattern: 'GP-{SEQ}/{YEAR}', require_approval: true, require_digital_signing: true, default_workflow_id: workflowId, allow_workflow_override: false } });
  expect(type.response.status()).toBe(201);
  const document = await api(request, '/documents', { method: 'POST', token: adminToken, data: { title: `${label} request`, document_type_id: type.body.data.id, require_digital_signing: true, file_name: `${label}.pdf`, file_base64: validPdf, mime_type: 'application/pdf' } });
  expect(document.response.ok()).toBeTruthy();
  const documentId = document.body.data.document.id as number;
  let signRequestId = document.body.data.document.sign_request_id as number | undefined;
  if (!signRequestId) {
    const created = await api(request, '/sign-requests', { method: 'POST', token: adminToken, data: { document_id: documentId, title: `${label} signing`, workflow_type: 'sequential', signers: signerUsers.map((s, index) => ({ email: s.email, name: s.name, role: 'signer', signing_order: index + 1 })) } });
    expect(created.response.ok()).toBeTruthy(); signRequestId = created.body.data.sign_request.id;
  }
  const current = await api(request, `/sign-requests/${signRequestId}`, { token: adminToken });
  for (const signer of signerUsers) {
    if (!current.body.data.sign_request.signers.some((s: { email: string }) => s.email === signer.email)) {
      const added = await api(request, `/sign-requests/${signRequestId}/signers`, { method: 'POST', token: adminToken, data: { email: signer.email, name: signer.name, role: 'signer', is_internal: true } });
      expect(added.response.ok()).toBeTruthy();
    }
  }
  const sent = await api(request, `/sign-requests/${signRequestId}/send`, { method: 'POST', token: adminToken });
  expect(sent.response.ok()).toBeTruthy();
  return { adminToken, me, documentId, signRequestId: signRequestId!, typeId: type.body.data.id as number, workflowId };
}
async function approveInUi(page: Page, approvalId: number, evidence: string) {
  await page.goto(`/my-tasks`);
  await expect(page.getByRole('heading', { name: 'Công việc của tôi' })).toBeVisible();
  await page.goto(`/approvals/${approvalId}`);
  await expect(page.getByRole('button', { name: 'Phê duyệt' })).toBeVisible();
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'Gõ tên' }).click();
  await dialog.getByRole('button', { name: /Xác nhận/ }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page).toHaveURL(/\/my-tasks/);
  await page.screenshot({ path: `../docs/qa/evidence/${evidence}`, fullPage: true });
}
async function signInUi(page: Page, signRequestId: number, evidence: string) {
  await page.goto('/my-tasks');
  await expect(page.getByRole('heading', { name: 'Công việc của tôi' })).toBeVisible();
  await page.goto(`/sign-requests/${signRequestId}/internal-sign`);
  const submit = page.getByRole('button', { name: /Hoàn tất ký/ });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText(/Đã ký thành công|Chờ ký/).first()).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: `../docs/qa/evidence/${evidence}`, fullPage: true });
}

test.describe.serial('Golden Path browser evidence', () => {
  test.skip(!apiBase || !adminEmail || !password, 'UAT credentials are required');

  test('PDF editor renders an authenticated document without a CDN worker', async ({ page, request }) => {
    const adminToken = await token(request, adminEmail!);
    const documentTypes = await api(request, '/document-types?purpose=create', { token: adminToken });
    expect(documentTypes.response.ok()).toBeTruthy();
    const documentTypeId = documentTypes.body.data.find((item: { is_active: boolean }) => item.is_active)?.id;
    expect(documentTypeId).toBeTruthy();

    const document = await api(request, '/documents', {
      method: 'POST',
      token: adminToken,
      data: {
        title: `PDF viewer ${Date.now()}`,
        document_type_id: documentTypeId,
        file_name: 'pdf-viewer-regression.pdf',
        file_base64: validPdf,
        mime_type: 'application/pdf',
      },
    });
    expect(document.response.ok()).toBeTruthy();
    const documentId = document.body.data.document.id as number;
    let signRequestId = document.body.data.document.sign_request_id as number | undefined;
    if (!signRequestId) {
      const me = await api(request, '/auth/me', { token: adminToken });
      const user = me.body.data.user as { id: number; email: string; full_name?: string };
      const signRequest = await api(request, '/sign-requests', {
        method: 'POST',
        token: adminToken,
        data: {
          document_id: documentId,
          title: `PDF viewer ${Date.now()} signing`,
          workflow_type: 'sequential',
          signers: [{ email: user.email, name: user.full_name || user.email, role: 'signer', signing_order: 1 }],
        },
      });
      expect(signRequest.response.ok()).toBeTruthy();
      signRequestId = signRequest.body.data.sign_request.id as number;
    }
    expect(signRequestId).toBeTruthy();

    await login(page, adminEmail!);
    await page.goto(`/sign-requests/${signRequestId}/editor`);
    await expect(page.getByText('Page 1 / 1')).toBeVisible({ timeout: 15_000 });
    await expect.poll(
      () => page.locator('canvas').first().evaluate((element) => (element as HTMLCanvasElement).width),
      { timeout: 15_000 },
    ).toBeGreaterThan(0);
  });

  test('Golden Path 1: UI approval, internal signing, artifact and authorized download', async ({ browser, page, request }) => {
    const admin = await token(request, adminEmail!);
    const me = (await api(request, '/auth/me', { token: admin })).body.data.user;
    const fixture = await configureAndCreate(request, `GP1 ${Date.now()}`, [me.id], [{ id: me.id, email: adminEmail!, name: me.full_name || adminEmail! }]);
    const pending = await api(request, '/approvals/my-pending', { token: fixture.adminToken });
    const approval = pending.body.data.approvals.find((a: { document: { id: number } }) => a.document.id === fixture.documentId);
    expect(approval).toBeTruthy();
    await login(page, adminEmail!);
    await page.goto('/document-types'); await expect(page.getByText(/GP1 .* type/).first()).toBeVisible();
    await page.goto('/workflows'); await expect(page.getByText(/GP1 .* workflow/).first()).toBeVisible();
    await approveInUi(page, approval.id, 'golden-path-1-approval-ui.png');
    await expect.poll(async () => (await api(request, `/sign-requests/${fixture.signRequestId}`, { token: fixture.adminToken })).body.data.sign_request.flow_state).toBe('AWAITING_SIGNATURES');
    const viewer = await browserFor(browser, viewerEmail);
    await viewer.page.goto(`/approvals/${approval.id}`); await expect(viewer.page).toHaveURL(/\/my-tasks|\/approvals$/);
    await viewer.context.close();
    await signInUi(page, fixture.signRequestId, 'golden-path-1-internal-sign-ui.png');
    await expect.poll(async () => (await api(request, `/sign-requests/${fixture.signRequestId}`, { token: fixture.adminToken })).body.data.sign_request.status, { timeout: 30_000 }).toBe('completed');
    const complete = await api(request, `/sign-requests/${fixture.signRequestId}`, { token: fixture.adminToken });
    expect(complete.body.data.sign_request.document.signed_file_path).toBeTruthy();
    const download = await api(request, `/documents/${fixture.documentId}/download-signed`, { token: fixture.adminToken });
    expect(download.response.ok()).toBeTruthy();
    await page.screenshot({ path: '../docs/qa/evidence/golden-path-1-completed.png', fullPage: true });
  });

  test('Golden Path 2: two UI approvals and sequential internal signers', async ({ browser, page, request }) => {
    const admin = await token(request, adminEmail!); const peer = await token(request, peerEmail);
    const adminMe = (await api(request, '/auth/me', { token: admin })).body.data.user;
    const peerMe = (await api(request, '/auth/me', { token: peer })).body.data.user;
    const fixture = await configureAndCreate(request, `GP2 ${Date.now()}`, [adminMe.id, peerMe.id], [{ id: adminMe.id, email: adminEmail!, name: adminMe.full_name || adminEmail! }, { id: peerMe.id, email: peerEmail, name: peerMe.full_name || peerEmail }]);
    const mine = await api(request, '/approvals/my-pending', { token: fixture.adminToken });
    const first = mine.body.data.approvals.find((a: { document: { id: number } }) => a.document.id === fixture.documentId); expect(first).toBeTruthy();
    await login(page, adminEmail!); await approveInUi(page, first.id, 'golden-path-2-approval-1-ui.png');
    const peerPending = await api(request, '/approvals/my-pending', { token: peer });
    const second = peerPending.body.data.approvals.find((a: { document: { id: number } }) => a.document.id === fixture.documentId); expect(second).toBeTruthy();
    const peerBrowser = await browserFor(browser, peerEmail); await approveInUi(peerBrowser.page, second.id, 'golden-path-2-approval-2-ui.png'); await peerBrowser.context.close();
    await expect.poll(async () => (await api(request, `/sign-requests/${fixture.signRequestId}`, { token: fixture.adminToken })).body.data.sign_request.flow_state).toBe('AWAITING_SIGNATURES');
    await signInUi(page, fixture.signRequestId, 'golden-path-2-signer-1-ui.png');
    const afterFirst = await api(request, `/sign-requests/${fixture.signRequestId}`, { token: fixture.adminToken });
    expect(afterFirst.body.data.sign_request.status).not.toBe('completed');
    const peerSigner = await browserFor(browser, peerEmail); await signInUi(peerSigner.page, fixture.signRequestId, 'golden-path-2-signer-2-ui.png'); await peerSigner.context.close();
    await expect.poll(async () => (await api(request, `/sign-requests/${fixture.signRequestId}`, { token: fixture.adminToken })).body.data.sign_request.status, { timeout: 30_000 }).toBe('completed');
    const complete = await api(request, `/sign-requests/${fixture.signRequestId}`, { token: fixture.adminToken });
    expect(complete.body.data.sign_request.document.signed_file_path).toBeTruthy();
    const download = await api(request, `/documents/${fixture.documentId}/download-signed`, { token: fixture.adminToken }); expect(download.response.ok()).toBeTruthy();
    await page.screenshot({ path: '../docs/qa/evidence/golden-path-2-completed.png', fullPage: true });
  });
});
