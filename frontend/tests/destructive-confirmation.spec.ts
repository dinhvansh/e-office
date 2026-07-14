import { expect, test, type Page } from '@playwright/test';

let deleteRequests = 0;
let deleteMode: 'success' | 'error' | 'pending' = 'success';

async function prepare(page: Page) {
  deleteRequests = 0;
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'DELETE' && url.includes('/external-orgs/7')) {
      deleteRequests += 1;
      if (deleteMode === 'pending') await new Promise((resolve) => setTimeout(resolve, 800));
      if (deleteMode === 'error') return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'internal database secret' } }) });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    }
    if (url.includes('/external-orgs')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ orgs: [{ id: 7, name: 'Cơ quan kiểm thử', code: 'TEST', category: 'partner', address: null, phone: null, email: null, contact_person: null, is_active: true, created_at: '2026-01-01' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false } }) });
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });
  await page.addInitScript(() => window.localStorage.setItem('esign.auth', JSON.stringify({ tokens: { accessToken: 'ux006' }, user: { id: 1, email: 'admin@example.test', role: 'super_admin' }, tenant: { id: 1, name: 'UX', plan: 'test', status: 'active' }, permissions: [] })));
  await page.goto('/external-orgs');
}

async function openDialog(page: Page) {
  const button = page.getByRole('button', { name: 'Xóa tổ chức ngoài: Cơ quan kiểm thử' });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByRole('heading', { name: 'Xóa tổ chức ngoài' })).toBeVisible();
  return button;
}

test('UX-006 cancel and Escape leave the target unchanged and restore focus', async ({ page }) => {
  deleteMode = 'success';
  await prepare(page);
  const trigger = await openDialog(page);
  await page.getByRole('button', { name: 'Hủy' }).click();
  await expect(page.getByRole('heading', { name: 'Xóa tổ chức ngoài' })).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(deleteRequests).toBe(0);
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Xóa tổ chức ngoài' })).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(deleteRequests).toBe(0);
});

test('UX-006 pending confirmation sends one request and prevents a duplicate', async ({ page }) => {
  deleteMode = 'pending';
  await prepare(page);
  await openDialog(page);
  const confirm = page.getByRole('button', { name: 'Xóa tổ chức' });
  await confirm.dblclick();
  await expect(page.getByRole('button', { name: 'Đang xử lý...' })).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/ux006-confirmation-pending-after-fix.png', fullPage: true });
  await expect.poll(() => deleteRequests).toBe(1);
  await expect(page.getByRole('heading', { name: 'Xóa tổ chức ngoài' })).toHaveCount(0);
});

test('UX-006 failure remains inline and can be retried', async ({ page }) => {
  deleteMode = 'error';
  await prepare(page);
  await openDialog(page);
  await page.screenshot({ path: '../docs/ux/evidence/ux006-confirmation-normal-after-fix.png', fullPage: true });
  await page.getByRole('button', { name: 'Xóa tổ chức' }).click();
  await expect(page.getByRole('alert')).toHaveText('Không thể xóa tổ chức. Vui lòng thử lại.');
  await expect(page.locator('body')).not.toContainText('internal database secret');
  await page.screenshot({ path: '../docs/ux/evidence/ux006-confirmation-error-after-fix.png', fullPage: true });
  deleteMode = 'success';
  await page.getByRole('button', { name: 'Xóa tổ chức' }).click();
  await expect.poll(() => deleteRequests).toBe(2);
});

test('UX-006 dialog remains usable at tablet and mobile widths', async ({ page }) => {
  deleteMode = 'success';
  await prepare(page);
  await page.setViewportSize({ width: 768, height: 900 });
  await openDialog(page);
  await expect(page.getByRole('button', { name: 'Hủy' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 375, height: 812 });
  await openDialog(page);
  await page.screenshot({ path: '../docs/ux/evidence/ux006-confirmation-mobile-after-fix.png', fullPage: true });
});
