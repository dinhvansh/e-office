import { expect, test, type Page } from '@playwright/test';

async function prepare(page: Page) {
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/document-types?purpose=create')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 7, name: 'Hợp đồng thử nghiệm', code: 'HD', require_digital_signing: true, require_approval: true, default_workflow_id: 12, allow_workflow_override: false, is_active: true }]) });
    }
    if (url.includes('/workflows/12')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ workflow: { steps: [
        { id: 1, step_name: 'Trưởng phòng phê duyệt', approver_type: 'user', approver_name: 'Nguyễn Văn A', approver_email: 'a@example.test', due_in_days: 3, is_required: true },
        { id: 2, step_name: 'Kiểm tra nghiệp vụ', approver_type: 'role', due_in_days: 1, is_required: false },
      ] } }) });
    }
    if (url.includes('/workflows')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    if (url.includes('/external-orgs')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.addInitScript(() => window.localStorage.setItem('esign.auth', JSON.stringify({ tokens: { accessToken: 'ux016' }, user: { id: 1, email: 'admin@example.test', role: 'super_admin' }, tenant: { id: 1, name: 'UX', plan: 'test', status: 'active' }, permissions: [] })));
  await page.goto('/sign-requests/create');
  await page.locator('input[type="file"]').setInputFiles({ name: 'workflow-preview.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n') });
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Hợp đồng thử nghiệm (HD)' }).click();
  await page.getByRole('button', { name: /Tiếp tục/ }).click();
}

async function expectVietnamesePreview(page: Page) {
  const title = page.getByRole('heading', { name: 'Quy trình phê duyệt' });
  const preview = title.locator('xpath=../..');
  await expect(title).toBeVisible();
  await expect(preview.getByText('2 bước', { exact: true })).toBeVisible();
  await expect(preview.getByText('Người dùng', { exact: true })).toBeVisible();
  await expect(preview.getByText('Vai trò', { exact: true })).toBeVisible();
  await expect(preview.getByText('3 ngày', { exact: true })).toBeVisible();
  await expect(preview.getByText('1 ngày', { exact: true })).toBeVisible();
  await expect(preview.getByText('Chưa có thông tin người phê duyệt')).toBeVisible();
  await expect(preview).not.toContainText(/Quy trinh phe duyet|buoc|Nguoi dung|Vai tro|Phong ban|Quan ly|ngay/);
}

test('UX-016 shows Vietnamese workflow preview labels at desktop and 375px', async ({ page }) => {
  await prepare(page);
  await expectVietnamesePreview(page);
  await page.getByRole('heading', { name: 'Quy trình phê duyệt' }).locator('xpath=../..').screenshot({ path: '../docs/ux/evidence/ux016-workflow-preview-desktop-after-fix.png' });

  await page.setViewportSize({ width: 375, height: 812 });
  await expectVietnamesePreview(page);
  await page.getByRole('heading', { name: 'Quy trình phê duyệt' }).locator('xpath=../..').screenshot({ path: '../docs/ux/evidence/ux016-workflow-preview-mobile-after-fix.png' });
});
