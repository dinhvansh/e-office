import { expect, test } from '@playwright/test';

async function signIn(page: import('@playwright/test').Page) {
  await page.addInitScript(() => window.localStorage.setItem('esign.auth', JSON.stringify({ tokens: { accessToken: 'ux007' }, user: { id: 1, email: 'owner@example.test', role: 'super_admin' }, tenant: { id: 1, name: 'UX', plan: 'test', status: 'active' }, permissions: ['documents:read', 'sign_requests:update'] })));
}

const request = (status: string, canRetry = false) => ({ sign_request: { id: 42, title: 'Hợp đồng thử nghiệm', message: null, status, workflow_type: 'sequential', created_at: '2026-07-15T08:00:00.000Z', deadline: '2026-07-20T08:00:00.000Z', document: { id: 9, title: 'Hợp đồng thử nghiệm', original_file_name: 'hop-dong.pdf', document_number: 'HD-09' }, signers: [{ id: 1, name: 'Người ký', email: 'signer@example.test', role: null, signing_order: 1, status: 'pending', signed_at: null, is_internal: true }], status_summary: { status, current_actor: status === 'artifact_failed' ? 'system' : 'signer', next_action: status === 'artifact_failed' ? 'RETRY_ARTIFACT' : 'WAIT_FOR_SIGNING', progress: { completed: 0, total: 1 }, deadline: '2026-07-20T08:00:00.000Z', can_retry_artifact: canRetry } } });

test('UX-007 shows plain-language status, action, deadline and authorized artifact retry', async ({ page }) => {
  await signIn(page);
  let retry = false;
  await page.route('http://127.0.0.1:4010/**', route => {
    const url = route.request().url();
    if (url.includes('/sign-requests/42/retry-artifact')) { retry = true; return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'generating_artifact' }) }); }
    if (url.includes('/sign-requests/42')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(request(retry ? 'generating_artifact' : 'artifact_failed', !retry)) });
    if (url.includes('/documents/9/')) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.goto('/sign-requests/42');
  await expect(page.getByRole('heading', { name: /Tiến độ xử lý: Chưa tạo được bản hoàn tất/ })).toBeVisible();
  await expect(page.getByText('Hệ thống', { exact: true })).toBeVisible();
  await expect(page.getByText('20 thg 7, 2026')).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/ux007-artifact-failure-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Thử tạo lại PDF' }).press('Enter');
  await expect(page.getByRole('heading', { name: /Đang tạo bản hoàn tất/ })).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/ux007-retry-success-desktop.png', fullPage: true });
});

test('UX-007 remains readable at tablet and mobile without exposing a retry to unauthorized viewers', async ({ page }) => {
  await signIn(page);
  await page.route('http://127.0.0.1:4010/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(request('expired', false)) }));
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/sign-requests/42');
  await expect(page.getByRole('heading', { name: /Đã hết hạn/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thử tạo lại PDF' })).toHaveCount(0);
  await page.screenshot({ path: '../docs/ux/evidence/ux007-expired-tablet.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByText('Tạo hoặc gửi lại yêu cầu mới.')).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/ux007-expired-mobile.png', fullPage: true });
});

test('UX-007 renders supported workflow states without raw enum values', async ({ page }) => {
  await signIn(page);
  let status = 'pending_approval';
  await page.route('http://127.0.0.1:4010/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(request(status, false)) }));
  for (const state of [
    ['pending_approval', 'Chờ phê duyệt', 'ux007-pending-approval.png'],
    ['pending', 'Chờ ký', 'ux007-pending-signing.png'],
    ['generating_artifact', 'Đang tạo bản hoàn tất', 'ux007-generating-artifact.png'],
    ['completed', 'Hoàn thành', 'ux007-completed.png'],
  ] as const) {
    status = state[0];
    await page.goto('/sign-requests/42');
    await expect(page.getByRole('heading', { name: new RegExp(state[1]) })).toBeVisible();
    await expect(page.locator('main, body').first()).not.toContainText(state[0]);
    await page.screenshot({ path: `../docs/ux/evidence/${state[2]}`, fullPage: true });
  }
});
