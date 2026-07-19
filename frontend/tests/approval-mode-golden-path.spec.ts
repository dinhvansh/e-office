import { expect, test, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';

type ApprovalMode = 'sequential' | 'parallel';
type TestUser = { id: number; email: string; full_name?: string | null };

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL;
const password = process.env.PLAYWRIGHT_PASSWORD;
const adminEmail = process.env.PLAYWRIGHT_EMAIL ?? 'admin@acme.local';
const approverAEmail = process.env.PLAYWRIGHT_APPROVER_A_EMAIL ?? 'manager@acme.local';
const approverBEmail = process.env.PLAYWRIGHT_APPROVER_B_EMAIL ?? 'legal@acme.local';
const nonAssignedEmail = process.env.PLAYWRIGHT_NON_ASSIGNED_EMAIL ?? 'finance@acme.local';
const validPdf = 'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAwIG4NCjAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0YK';

function authorization(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function api(
  request: APIRequestContext,
  path: string,
  init: { token: string; method?: string; data?: unknown },
) {
  const response = await request.fetch(`${apiBase}${path}`, {
    method: init.method,
    data: init.data,
    headers: authorization(init.token),
  });
  const body = (response.headers()['content-type'] ?? '').includes('application/json') ? await response.json() : null;
  return { response, body };
}

async function issueToken(request: APIRequestContext, email: string) {
  const response = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  expect(response.ok(), `Đăng nhập API thất bại cho ${email}: ${await response.text()}`).toBeTruthy();
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
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email);
  return { context, page };
}

async function loadUsers(request: APIRequestContext, adminToken: string) {
  const result = await api(request, '/users', { token: adminToken });
  expect(result.response.ok()).toBeTruthy();
  const users = result.body.data ?? result.body;
  const byEmail = (email: string) => {
    const user = (users as TestUser[]).find((item) => item.email === email);
    expect(user, `Không tìm thấy test user ${email}`).toBeTruthy();
    return user!;
  };
  return {
    approverA: byEmail(approverAEmail),
    approverB: byEmail(approverBEmail),
    nonAssigned: byEmail(nonAssignedEmail),
  };
}

async function addStepInUi(page: Page, workflowName: string, stepName: string, user: TestUser) {
  const workflowRow = page.locator('tr').filter({ hasText: workflowName });
  if (!(await page.getByRole('dialog', { name: new RegExp(`Quản lý các bước: ${workflowName}`) }).isVisible().catch(() => false))) {
    await workflowRow.getByTitle('Quản lý các bước').click();
  }
  const managerDialog = page.getByRole('dialog', { name: new RegExp(`Quản lý các bước: ${workflowName}`) });
  await managerDialog.getByRole('button', { name: 'Thêm bước mới' }).click();
  const stepDialog = page.getByRole('dialog', { name: 'Thêm bước phê duyệt' });
  await stepDialog.getByPlaceholder('VD: Phê duyệt cấp trưởng phòng').fill(stepName);
  await stepDialog.locator('select').nth(2).selectOption(String(user.id));
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes('/workflows/') && response.url().endsWith('/steps') && response.request().method() === 'POST');
  await stepDialog.getByRole('button', { name: 'Thêm', exact: true }).click();
  expect((await responsePromise).ok()).toBeTruthy();
  await expect(stepDialog).toBeHidden();
}

async function createWorkflowInUi(
  page: Page,
  name: string,
  mode: ApprovalMode,
  approvers: [TestUser, TestUser],
) {
  await page.goto('/workflows');
  await page.getByRole('button', { name: 'Tạo quy trình mới' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tạo quy trình mới' });
  await dialog.getByPlaceholder('VD: Phê duyệt hợp đồng').fill(name);
  const modeSelect = dialog.getByLabel('Chế độ duyệt');
  await modeSelect.click();
  await page.getByRole('option', { name: mode === 'parallel' ? 'Duyệt song song' : 'Duyệt tuần tự' }).click();
  const createResponse = page.waitForResponse((response) =>
    response.url().endsWith('/workflows') && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Lưu' }).click();
  const response = await createResponse;
  expect(response.status()).toBe(201);
  const workflowId = (await response.json()).data.workflow.id as number;
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();

  await addStepInUi(page, name, `${name} - Bước 1`, approvers[0]);
  await addStepInUi(page, name, `${name} - Bước 2`, approvers[1]);
  const managerDialog = page.getByRole('dialog', { name: new RegExp(`Quản lý các bước: ${name}`) });
  await expect(managerDialog.getByText(`${name} - Bước 1`, { exact: true })).toBeVisible();
  await expect(managerDialog.getByText(`${name} - Bước 2`, { exact: true })).toBeVisible();
  await managerDialog.getByRole('button', { name: 'Đóng', exact: true }).click();

  await page.reload();
  await page.locator('tr').filter({ hasText: name }).getByTitle('Chỉnh sửa').click();
  const editDialog = page.getByRole('dialog', { name: 'Chỉnh sửa quy trình' });
  await expect(editDialog.getByLabel('Chế độ duyệt')).toContainText(
    mode === 'parallel' ? 'Duyệt song song' : 'Duyệt tuần tự',
  );
  await editDialog.getByRole('button', { name: 'Hủy' }).click();
  return workflowId;
}

async function createDocumentType(request: APIRequestContext, token: string, workflowId: number, label: string) {
  const code = `AM${Date.now().toString().slice(-8)}`;
  const result = await api(request, '/document-types', {
    token,
    method: 'POST',
    data: {
      code,
      name: `${label} loại văn bản`,
      require_numbering: true,
      numbering_pattern: 'AM-{SEQ}/{YEAR}',
      require_approval: true,
      require_digital_signing: false,
      default_workflow_id: workflowId,
      allow_workflow_override: false,
    },
  });
  expect(result.response.status()).toBe(201);
  return { id: result.body.data.id as number, code, name: result.body.data.name as string };
}

async function verifyPreviewInUi(page: Page, documentType: { code: string; name: string }, mode: ApprovalMode) {
  await page.goto('/sign-requests/create');
  await page.locator('input[type="file"]').setInputFiles({
    name: `${mode}-approval.pdf`,
    mimeType: 'application/pdf',
    buffer: Buffer.from(validPdf, 'base64'),
  });
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: `${documentType.name} (${documentType.code})` }).click();
  await page.getByRole('button', { name: /Tiếp tục/ }).click();
  const preview = page.getByRole('heading', { name: 'Quy trình phê duyệt' }).locator('xpath=../..');
  await expect(preview.getByText(mode === 'parallel' ? 'Duyệt song song' : 'Duyệt tuần tự', { exact: true })).toBeVisible();
  if (mode === 'parallel') {
    await expect(preview.getByText('Đồng thời', { exact: true })).toHaveCount(2);
  } else {
    await expect(preview.getByText('Các bước được kích hoạt lần lượt theo thứ tự.')).toBeVisible();
  }
}

async function createAndSubmitDocument(
  request: APIRequestContext,
  token: string,
  documentTypeId: number,
  workflowId: number,
  title: string,
) {
  const created = await api(request, '/documents', {
    token,
    method: 'POST',
    data: {
      title,
      document_type_id: documentTypeId,
      file_name: `${title}.pdf`,
      file_base64: validPdf,
      mime_type: 'application/pdf',
    },
  });
  expect(created.response.ok()).toBeTruthy();
  const documentId = created.body.data.document.id as number;
  const submitted = await api(request, '/approvals/submit', {
    token,
    method: 'POST',
    data: { document_id: documentId, workflow_id: workflowId },
  });
  expect(submitted.response.status()).toBe(201);
  return documentId;
}

async function documentApprovals(request: APIRequestContext, token: string, documentId: number) {
  const result = await api(request, `/approvals/document/${documentId}`, { token });
  expect(result.response.ok()).toBeTruthy();
  return result.body.data.approvals as Array<{
    id: number;
    action: string;
    approver_user_id: number;
    workflow_instance_id: number;
    workflow_step: { step_order: number };
  }>;
}

async function workflowInstance(request: APIRequestContext, token: string, documentId: number) {
  const result = await api(request, `/approvals/document/${documentId}/workflow`, { token });
  expect(result.response.ok()).toBeTruthy();
  return result.body.data.instance as { id: number; status: string; current_step_id?: number | null } | null;
}

async function documentStatus(request: APIRequestContext, token: string, documentId: number) {
  const result = await api(request, `/documents/${documentId}`, { token });
  expect(result.response.ok()).toBeTruthy();
  return result.body.data.document.status as string;
}

async function pendingTasks(request: APIRequestContext, token: string) {
  const result = await api(request, '/approvals/my-pending?limit=100', { token });
  expect(result.response.ok()).toBeTruthy();
  return result.body.data.approvals as Array<{ id: number; document: { id: number; title: string } }>;
}

async function approvalNotifications(request: APIRequestContext, token: string, documentTitle: string) {
  const result = await api(request, '/notifications?limit=100', { token });
  expect(result.response.ok()).toBeTruthy();
  return (result.body.notifications as Array<{ type: string; message: string }>).filter(
    (item) => item.type === 'approval_request' && item.message.includes(documentTitle),
  );
}

async function approveInUi(page: Page, approvalId: number, documentTitle: string) {
  await page.goto('/my-tasks');
  await expect(page.getByRole('heading', { name: 'Công việc của tôi' })).toBeVisible();
  await expect(page.getByText(documentTitle, { exact: false }).first()).toBeVisible();
  await page.goto(`/approvals/${approvalId}`);
  await page.getByRole('button', { name: 'Phê duyệt' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'Gõ tên' }).click();
  await dialog.getByRole('button', { name: /Xác nhận/ }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page).toHaveURL(/\/my-tasks/);
}

test.describe.serial('Approval Mode golden path với API và PostgreSQL thật', () => {
  test.skip(!apiBase || !password, 'PLAYWRIGHT_API_BASE_URL và PLAYWRIGHT_PASSWORD là bắt buộc');

  test('Sequential: UI persistence, ordered My Tasks, authorization và notifications', async ({ browser, page, request }) => {
    const label = `E2E tuần tự ${Date.now()}`;
    const title = `${label} tài liệu`;
    const adminToken = await issueToken(request, adminEmail);
    const tokenA = await issueToken(request, approverAEmail);
    const tokenB = await issueToken(request, approverBEmail);
    const nonAssignedToken = await issueToken(request, nonAssignedEmail);
    const users = await loadUsers(request, adminToken);

    await login(page, adminEmail);
    const workflowId = await createWorkflowInUi(page, `${label} workflow`, 'sequential', [users.approverA, users.approverB]);
    const persistedWorkflow = await api(request, `/workflows/${workflowId}`, { token: adminToken });
    expect(persistedWorkflow.body.data.workflow.approval_mode).toBe('sequential');
    const documentType = await createDocumentType(request, adminToken, workflowId, label);
    await verifyPreviewInUi(page, documentType, 'sequential');
    const documentId = await createAndSubmitDocument(request, adminToken, documentType.id, workflowId, title);

    let approvals = await documentApprovals(request, adminToken, documentId);
    const approvalA = approvals.find((item) => item.approver_user_id === users.approverA.id)!;
    const approvalB = approvals.find((item) => item.approver_user_id === users.approverB.id)!;
    expect(approvalA.action).toBe('pending');
    expect(approvalB.action).toBe('waiting');
    expect(approvalA.workflow_instance_id).toBe(approvalB.workflow_instance_id);
    expect((await pendingTasks(request, tokenB)).some((item) => item.document.id === documentId)).toBeFalsy();
    expect(await approvalNotifications(request, tokenA, title)).toHaveLength(1);
    expect(await approvalNotifications(request, tokenB, title)).toHaveLength(0);

    const futureAttempt = await api(request, `/approvals/${approvalB.id}/approve`, { token: tokenB, method: 'POST', data: {} });
    expect(futureAttempt.response.status()).toBe(400);
    expect(futureAttempt.body.error.code).toBe('APPROVAL_ALREADY_ACTED');
    const outsiderAttempt = await api(request, `/approvals/${approvalA.id}/approve`, { token: nonAssignedToken, method: 'POST', data: {} });
    expect([403, 404]).toContain(outsiderAttempt.response.status());

    const browserA = await browserFor(browser, approverAEmail);
    await approveInUi(browserA.page, approvalA.id, title);
    await browserA.context.close();
    expect((await workflowInstance(request, adminToken, documentId))?.status).toBe('in_progress');
    expect((await pendingTasks(request, tokenB)).some((item) => item.document.id === documentId)).toBeTruthy();
    expect(await approvalNotifications(request, tokenB, title)).toHaveLength(1);

    const browserB = await browserFor(browser, approverBEmail);
    await approveInUi(browserB.page, approvalB.id, title);
    await browserB.context.close();
    approvals = await documentApprovals(request, adminToken, documentId);
    expect(approvals.map((item) => item.action)).toEqual(['approved', 'approved']);
    expect(await workflowInstance(request, adminToken, documentId)).toBeNull();
    expect(await documentStatus(request, adminToken, documentId)).toBe('completed');
  });

  test('Parallel: simultaneous My Tasks, own-assignment authorization và single completion', async ({ browser, page, request }) => {
    const label = `E2E song song ${Date.now()}`;
    const title = `${label} tài liệu`;
    const adminToken = await issueToken(request, adminEmail);
    const tokenA = await issueToken(request, approverAEmail);
    const tokenB = await issueToken(request, approverBEmail);
    const users = await loadUsers(request, adminToken);

    await login(page, adminEmail);
    const workflowId = await createWorkflowInUi(page, `${label} workflow`, 'parallel', [users.approverA, users.approverB]);
    const persistedWorkflow = await api(request, `/workflows/${workflowId}`, { token: adminToken });
    expect(persistedWorkflow.body.data.workflow.approval_mode).toBe('parallel');
    const documentType = await createDocumentType(request, adminToken, workflowId, label);
    await verifyPreviewInUi(page, documentType, 'parallel');
    const documentId = await createAndSubmitDocument(request, adminToken, documentType.id, workflowId, title);

    let approvals = await documentApprovals(request, adminToken, documentId);
    const approvalA = approvals.find((item) => item.approver_user_id === users.approverA.id)!;
    const approvalB = approvals.find((item) => item.approver_user_id === users.approverB.id)!;
    expect(approvals.map((item) => item.action)).toEqual(['pending', 'pending']);
    expect(new Set(approvals.map((item) => item.workflow_instance_id)).size).toBe(1);
    expect((await pendingTasks(request, tokenA)).some((item) => item.document.id === documentId)).toBeTruthy();
    expect((await pendingTasks(request, tokenB)).some((item) => item.document.id === documentId)).toBeTruthy();
    expect(await approvalNotifications(request, tokenA, title)).toHaveLength(1);
    expect(await approvalNotifications(request, tokenB, title)).toHaveLength(1);

    const crossAssignmentAttempt = await api(request, `/approvals/${approvalB.id}/approve`, { token: tokenA, method: 'POST', data: {} });
    expect([403, 404]).toContain(crossAssignmentAttempt.response.status());

    const browserA = await browserFor(browser, approverAEmail);
    await approveInUi(browserA.page, approvalA.id, title);
    await browserA.context.close();
    expect((await workflowInstance(request, adminToken, documentId))?.status).toBe('in_progress');
    approvals = await documentApprovals(request, adminToken, documentId);
    expect(approvals.find((item) => item.id === approvalB.id)?.action).toBe('pending');

    const browserB = await browserFor(browser, approverBEmail);
    await approveInUi(browserB.page, approvalB.id, title);
    await browserB.context.close();
    approvals = await documentApprovals(request, adminToken, documentId);
    expect(approvals.map((item) => item.action)).toEqual(['approved', 'approved']);
    expect(await workflowInstance(request, adminToken, documentId)).toBeNull();
    expect(await documentStatus(request, adminToken, documentId)).toBe('completed');
    expect(await approvalNotifications(request, tokenA, title)).toHaveLength(1);
    expect(await approvalNotifications(request, tokenB, title)).toHaveLength(1);
  });
});
