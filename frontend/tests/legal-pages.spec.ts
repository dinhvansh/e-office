import { expect, test } from '@playwright/test';

for (const [path, heading] of [['/terms', 'Điều khoản sử dụng'], ['/privacy', 'Chính sách bảo mật']] as const) {
  test(`${path} is public and keyboard accessible`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByText('Bản dự thảo cho public beta — đang chờ rà soát pháp lý.')).toBeVisible();
    await page.getByRole('link', { name: 'Quay lại đăng ký' }).focus();
    await expect(page.getByRole('link', { name: 'Quay lại đăng ký' })).toBeFocused();
  });
}

test('UX-001 legal links work and retain registration values at 375px', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Họ và tên').fill('Nguyễn Kiểm thử');
  await page.getByLabel('Email').fill('legal@example.test');
  await page.getByRole('link', { name: 'điều khoản sử dụng' }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await page.goBack();
  await expect(page.getByLabel('Họ và tên')).toHaveValue('Nguyễn Kiểm thử');
  await expect(page.getByLabel('Email')).toHaveValue('legal@example.test');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('link', { name: 'chính sách bảo mật' }).click();
  await expect(page.getByRole('heading', { name: 'Chính sách bảo mật' })).toBeVisible();
  await page.screenshot({ path: '../docs/ux/evidence/ux001-privacy-mobile-after-fix.png', fullPage: true });
});
