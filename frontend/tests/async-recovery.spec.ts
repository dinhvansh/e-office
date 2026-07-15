import { expect, test } from '@playwright/test';

async function signIn(page: import('@playwright/test').Page) {
  await page.addInitScript(() => window.localStorage.setItem('esign.auth', JSON.stringify({ tokens: { accessToken: 'ux009' }, user: { id: 1, email: 'admin@example.test', role: 'super_admin' }, tenant: { id: 1, name: 'UX', plan: 'test', status: 'active' }, permissions: ['documents:read'] })));
}

test('UX-009 notification loading, error, retry and empty states are accessible', async ({ page }) => {
  let attempts = 0;
  await signIn(page);
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/notifications?')) { attempts += 1; if (attempts === 1) { await new Promise(resolve => setTimeout(resolve, 300)); return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'secret backend detail' } }) }); } return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ notifications: [] }) }); }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ documents: [], stats: {}, tenant: {}, notifications: [] }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mở thông báo' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đang tải thông báo' })).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/ux009-notifications-loading-after-fix.png', fullPage: true });
  await expect(page.getByRole('alert').filter({ hasText: 'Không thể tải thông báo' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('secret backend detail');
  await page.screenshot({ path: '../docs/ux/evidence/ux009-notifications-error-after-fix.png', fullPage: true });
  await page.getByRole('alert').getByRole('button').click();
  await expect(page.getByText('Không có thông báo')).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/ux009-notifications-empty-after-fix.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByText('Không có thông báo')).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/ux009-notifications-mobile-after-fix.png', fullPage: true });
});

test('UX-009 dashboard and documents show persistent retryable errors', async ({ page }) => {
  await signIn(page);
  let failDocuments = true;
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/documents')) return route.fulfill({ status: failDocuments ? 500 : 200, contentType: 'application/json', body: JSON.stringify(failDocuments ? { error: { message: 'internal trace' } } : { documents: [] }) });
    if (url.includes('/document-types')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    if (url.includes('/workflows')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    if (url.includes('/external-orgs')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ tenant: {}, approvals: [], signRequests: [], users: [] }) });
  });
  await page.goto('/documents');
  const recovery = page.getByRole('alert').filter({ hasText: 'Không thể tải tài liệu' });
  await expect(recovery).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).not.toContainText('internal trace');
  failDocuments = false;
  await recovery.getByRole('button').click();
  await expect(recovery).toHaveCount(0);
  await page.screenshot({ path: '../docs/ux/evidence/ux009-documents-retry-after-fix.png', fullPage: true });
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('status')).toBeVisible();
});

test('UX-009 My Tasks resolves loading into retryable error and empty state', async ({ page }) => {
  await signIn(page);
  let failed = true;
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/approvals/my-tasks')) return route.fulfill({ status: failed ? 500 : 200, contentType: 'application/json', body: JSON.stringify(failed ? { error: { message: 'internal task trace' } } : { tasks: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }, statistics: {} }) });
    if (url.includes('/document-types')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.goto('/my-tasks');
  await expect(page.getByText('Không thể tải công việc. Vui lòng thử lại.')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).not.toContainText('internal task trace');
  failed = false;
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Không có công việc nào')).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/ux009-my-tasks-empty-after-fix.png', fullPage: true });
});

test('UX-009 approvals and sign requests show safe error and empty states', async ({ page }) => {
  await signIn(page);
  let failApprovals = true;
  let failRequests = true;
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/approvals/my-pending')) return route.fulfill({ status: failApprovals ? 500 : 200, contentType: 'application/json', body: JSON.stringify(failApprovals ? { error: { message: 'approval internals' } } : { approvals: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }) });
    if (url.includes('/sign-requests/my-requests')) return route.fulfill({ status: failRequests ? 500 : 200, contentType: 'application/json', body: JSON.stringify(failRequests ? { error: { message: 'request internals' } } : { sign_requests: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }) });
    if (url.includes('/document-types')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.goto('/approvals');
  await expect(page.getByText('Không thể tải yêu cầu phê duyệt. Vui lòng thử lại.')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).not.toContainText('approval internals');
  failApprovals = false;
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByRole('heading', { name: 'Không có yêu cầu phê duyệt' })).toBeVisible();
  await page.goto('/sign-requests');
  const requestError = page.getByRole('alert').filter({ hasText: 'Không thể tải trình ký' });
  await expect(requestError).toBeVisible({ timeout: 15_000 });
  failRequests = false;
  await requestError.getByRole('button').click();
  await expect(requestError).toHaveCount(0);
  await page.screenshot({ path: '../docs/ux/evidence/ux009-sign-requests-empty-after-fix.png', fullPage: true });
});

test('UX-009 create request keeps form input after failure and prevents duplicate submit', async ({ page }) => {
  await signIn(page);
  let createAttempts = 0;
  let shouldFail = true;
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/document-types?purpose=create')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 7, name: 'Hợp đồng kiểm thử', code: 'HD', require_digital_signing: true, require_approval: false, default_workflow_id: null, allow_workflow_override: false, is_active: true }]) });
    if (url.includes('/documents') && route.request().method() === 'POST') { createAttempts += 1; if (shouldFail) await new Promise(resolve => setTimeout(resolve, 500)); return route.fulfill({ status: shouldFail ? 500 : 200, contentType: 'application/json', body: JSON.stringify(shouldFail ? { error: { message: 'create internals' } } : { document: { sign_request_id: 42 } }) }); }
    if (url.includes('/document-types') || url.includes('/workflows') || url.includes('/external-orgs')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.goto('/sign-requests/create');
  await page.locator('#file-upload').setInputFiles({ name: 'hop-dong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Hợp đồng kiểm thử (HD)' }).click();
  const submit = page.getByRole('button', { name: 'Tiếp tục sang editor' });
  await submit.dblclick();
  const submitError = page.getByRole('alert').filter({ hasText: 'Dữ liệu bạn đã nhập vẫn được giữ nguyên' });
  await expect(submitError).toBeVisible();
  await expect(page.getByText('hop-dong.pdf')).toBeVisible();
  await expect.poll(() => createAttempts).toBe(1);
  shouldFail = false;
  await submit.click();
  await expect(submitError).toHaveCount(0);
});

test('UX-009 dashboard error is recoverable at tablet width', async ({ page }) => {
  await signIn(page);
  let fail = true;
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/documents')) return route.fulfill({ status: fail ? 500 : 200, contentType: 'application/json', body: JSON.stringify(fail ? { error: { message: 'dashboard internals' } } : { documents: [] }) });
    if (url.includes('/tenants/me')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ tenant: {} }) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/');
  const dashboardError = page.getByRole('alert').filter({ hasText: 'Không thể tải tổng quan' });
  await expect(dashboardError).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).not.toContainText('dashboard internals');
  await page.screenshot({ path: '../docs/ux/evidence/ux009-dashboard-error-after-fix.png', fullPage: true });
  fail = false;
  await dashboardError.getByRole('button').click();
  await expect(dashboardError).toHaveCount(0);
});
