import { expect, test } from '@playwright/test';

async function signIn(page: import('@playwright/test').Page) {
  await page.addInitScript(() => window.localStorage.setItem('esign.auth', JSON.stringify({
    tokens: { accessToken: 'ux005' },
    user: { id: 1, email: 'admin@example.test', role: 'super_admin' },
    tenant: { id: 1, name: 'UX', plan: 'test', status: 'active' },
    permissions: [],
  })));
}

test('UX-005 guides document, workflow, participants and review while retaining values', async ({ page }) => {
  await signIn(page);
  let creates = 0;

  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/tenants/me')) return route.fulfill({ json: { tenant: { id: 1, name: 'UX', status: 'active' } } });
    if (url.includes('/permissions')) return route.fulfill({ json: { permissions: [] } });
    if (url.includes('/document-types')) {
      return route.fulfill({ json: [{
        id: 7,
        name: 'Hợp đồng',
        code: 'HD',
        require_digital_signing: true,
        require_approval: false,
        default_workflow_id: null,
        allow_workflow_override: false,
        is_active: true,
      }] });
    }
    if (url.includes('/documents') && route.request().method() === 'POST') {
      creates += 1;
      return route.fulfill({ json: { document: { sign_request_id: 42 } } });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto('/sign-requests/create');
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(page.getByText('Vui lòng chọn tệp trước khi tiếp tục.')).toBeVisible();

  await page.locator('#file-upload').setInputFiles({
    name: 'hop-dong.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Hợp đồng (HD)' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(page.getByText('Loại văn bản này không yêu cầu phê duyệt.')).toBeVisible();

  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(page.getByText('3. Người ký và thông tin bổ sung')).toBeVisible();
  await page.getByRole('button', { name: 'Thêm người ký', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email *', exact: true }).fill('signer@example.test');
  await page.getByPlaceholder('Nguyễn Văn A').fill('Người ký Test');

  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await expect(page.getByText('Rà soát trước khi tạo')).toBeVisible();
  await expect(page.getByText('hop-dong.pdf')).toBeVisible();

  const submit = page.getByRole('button', { name: 'Tiếp tục sang editor' });
  await submit.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => creates).toBe(1);
});
