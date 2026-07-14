import { expect, test } from '@playwright/test';

test('pending account receives localized activation guidance', async ({ page }) => {
  let loginRequests = 0;
  await page.route('**/auth/login', route => {
    loginRequests += 1;
    return route.fulfill({ status: 403, json: { success: false, error: { code: 'ACCOUNT_NOT_ACTIVE', message: 'Account is not active' } } });
  });
  await page.goto('/login');
  await page.getByLabel('Email').fill('pending@example.test');
  await page.getByLabel('Mật khẩu').fill('correct-password');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect.poll(() => loginRequests).toBe(1);
  await expect(page.getByText(/đang chờ được kích hoạt/i)).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/login-pending-account-after-fix.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: '../docs/ux/evidence/login-pending-account-mobile-after-fix.png', fullPage: true });
});
