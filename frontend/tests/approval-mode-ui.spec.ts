import { expect, test, type Page, type Route } from '@playwright/test';

type WorkflowFixture = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  approval_mode?: unknown;
  steps: Array<Record<string, unknown>>;
};

const authSession = {
  tokens: { accessToken: 'approval-mode-ui' },
  user: { id: 1, email: 'admin@example.test', role: 'super_admin' },
  tenant: { id: 1, name: 'Approval Mode', plan: 'test', status: 'active' },
  permissions: [],
};

async function authenticate(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('esign.auth', JSON.stringify(session));
  }, authSession);
}

async function mockWorkflowAdminApi(
  page: Page,
  workflows: WorkflowFixture[],
  onWrite?: (route: Route) => Promise<void>,
) {
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname.endsWith('/roles/my-permissions')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }
    if (url.pathname.endsWith('/workflows') && method === 'GET') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ workflows }) });
    }
    if (url.pathname.includes('/workflows') && ['POST', 'PUT'].includes(method) && onWrite) {
      return onWrite(route);
    }
    if (url.pathname.endsWith('/users') || url.pathname.endsWith('/departments')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (url.pathname.endsWith('/positions')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ positions: [] }) });
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) });
  });
}

function workflow(id: number, approvalMode?: unknown): WorkflowFixture {
  return {
    id,
    name: `Quy trình ${id}`,
    description: 'Kiểm thử chế độ duyệt',
    is_active: true,
    approval_mode: approvalMode,
    steps: [],
  };
}

test('workflow mới mặc định tuần tự và gửi parallel khi được chọn', async ({ page }) => {
  let submittedPayload: Record<string, unknown> | undefined;
  await authenticate(page);
  await mockWorkflowAdminApi(page, [], async (route) => {
    submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 99, ...submittedPayload }) });
  });

  await page.goto('/workflows');
  await page.getByRole('button', { name: 'Tạo quy trình mới' }).click();
  const dialog = page.getByRole('dialog');
  const modeSelect = dialog.getByLabel('Chế độ duyệt');

  await expect(modeSelect).toContainText('Duyệt tuần tự');
  await expect(dialog.getByText('Người duyệt xử lý lần lượt theo thứ tự từng bước.')).toBeVisible();
  await modeSelect.click();
  await page.getByRole('option', { name: 'Duyệt song song' }).click();
  await expect(dialog.getByText('Tất cả người duyệt được yêu cầu xử lý cùng lúc. Workflow chỉ tiếp tục khi tất cả đã duyệt.')).toBeVisible();

  await dialog.getByPlaceholder('VD: Phê duyệt hợp đồng').fill('Quy trình song song');
  await dialog.getByRole('button', { name: 'Lưu' }).click();
  await expect.poll(() => submittedPayload).toMatchObject({
    name: 'Quy trình song song',
    approval_mode: 'parallel',
  });
});

test('workflow parallel được load lại đúng khi edit và refresh', async ({ page }) => {
  const fixture = workflow(21, 'parallel');
  await authenticate(page);
  await mockWorkflowAdminApi(page, [fixture]);

  await page.goto('/workflows');
  await page.getByTitle('Chỉnh sửa').first().click();
  await expect(page.getByRole('dialog').getByLabel('Chế độ duyệt')).toContainText('Duyệt song song');
  await page.getByRole('button', { name: 'Hủy' }).click();

  await page.reload();
  await page.getByTitle('Chỉnh sửa').first().click();
  await expect(page.getByRole('dialog').getByLabel('Chế độ duyệt')).toContainText('Duyệt song song');
});

test('workflow tuần tự và workflow legacy thiếu mode đều load về tuần tự khi edit', async ({ page }) => {
  await authenticate(page);
  await mockWorkflowAdminApi(page, [workflow(22, 'sequential'), workflow(23)]);

  await page.goto('/workflows');
  await page.locator('tr').filter({ hasText: 'Quy trình 22' }).getByTitle('Chỉnh sửa').click();
  await expect(page.getByRole('dialog').getByLabel('Chế độ duyệt')).toContainText('Duyệt tuần tự');
  await page.getByRole('button', { name: 'Hủy' }).click();

  await page.locator('tr').filter({ hasText: 'Quy trình 23' }).getByTitle('Chỉnh sửa').click();
  await expect(page.getByRole('dialog').getByLabel('Chế độ duyệt')).toContainText('Duyệt tuần tự');
});

async function preparePreview(page: Page, approvalMode: unknown) {
  const steps = [1, 2, 3].map((id) => ({
    id,
    step_name: `Bước ${id}`,
    approver_type: 'user',
    approver_name: `Người duyệt ${id}`,
    approver_email: `approver${id}@example.test`,
    due_in_days: 2,
    is_required: true,
  }));

  await authenticate(page);
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/roles/my-permissions')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }
    if (url.includes('/document-types?purpose=create')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{
        id: 7,
        name: 'Hợp đồng',
        code: 'HD',
        require_digital_signing: true,
        require_approval: true,
        default_workflow_id: 12,
        allow_workflow_override: false,
        is_active: true,
      }]) });
    }
    if (url.includes('/workflows/12')) {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ workflow: { approval_mode: approvalMode, steps } }),
      });
    }
    if (url.includes('/workflows') || url.includes('/external-orgs')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.goto('/sign-requests/create');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'approval-mode-preview.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n'),
  });
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Hợp đồng (HD)' }).click();
  await page.getByRole('button', { name: /Tiếp tục/ }).click();
  return page.getByRole('heading', { name: 'Quy trình phê duyệt' }).locator('xpath=../..');
}

test('preview tuần tự thể hiện các bước chạy lần lượt', async ({ page }) => {
  const preview = await preparePreview(page, 'sequential');
  await expect(preview.getByText('Duyệt tuần tự', { exact: true })).toBeVisible();
  await expect(preview.getByText('Các bước được kích hoạt lần lượt theo thứ tự.')).toBeVisible();
  await expect(preview.getByText('Đồng thời')).toHaveCount(0);
});

test('preview song song thể hiện tất cả bước được kích hoạt đồng thời', async ({ page }) => {
  const preview = await preparePreview(page, 'parallel');
  await expect(preview.getByText('Duyệt song song', { exact: true })).toBeVisible();
  await expect(preview.getByText('Tất cả bước duyệt được kích hoạt đồng thời.')).toBeVisible();
  await expect(preview.getByText('Đồng thời', { exact: true })).toHaveCount(3);
});

test('giá trị legacy thiếu hoặc không hợp lệ fallback về tuần tự', async ({ page }) => {
  const preview = await preparePreview(page, 'legacy-value');
  await expect(preview.getByText('Duyệt tuần tự', { exact: true })).toBeVisible();
  await expect(preview.getByText('Đồng thời')).toHaveCount(0);
});
