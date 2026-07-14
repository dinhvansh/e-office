import { expect, test } from '@playwright/test';

const forbidden = /NEXT_PUBLIC_API|environment variable|Unhandled Runtime Error|Error: /i;

for (const [name, path] of [['login', '/login'], ['protected', '/settings/system']] as const) {
  test(`UX-011 ${name} route renders the safe configuration guard`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Dịch vụ tạm thời chưa sẵn sàng' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Liên hệ quản trị viên' })).toBeVisible();
    await page.getByRole('link', { name: 'Liên hệ quản trị viên' }).focus();
    await expect(page.getByRole('link', { name: 'Liên hệ quản trị viên' })).toBeFocused();
    await expect(page.locator('body')).not.toContainText(forbidden);
    await page.screenshot({ path: `../docs/ux/evidence/ux011-${name}-desktop-after-fix.png`, fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { name: 'Dịch vụ tạm thời chưa sẵn sàng' })).toBeVisible();
    await page.screenshot({ path: `../docs/ux/evidence/ux011-${name}-mobile-after-fix.png`, fullPage: true });
  });
}
