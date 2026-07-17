import { expect, test } from '@playwright/test';

const apiBase = process.env.PLAYWRIGHT_API_BASE_URL ?? 'http://127.0.0.1:4010/api/v1';

test('Document flow exposes the discussion target used by comment notifications', async ({ page, request }) => {
  const email = process.env.PLAYWRIGHT_EMAIL ?? '';
  const password = process.env.PLAYWRIGHT_PASSWORD ?? '';
  test.skip(!email || !password, 'PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required');

  const login = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).data.tokens.accessToken as string;
  const requests = await request.get(`${apiBase}/sign-requests`, { headers: { Authorization: `Bearer ${token}` } });
  expect(requests.ok()).toBeTruthy();
  const signRequest = (await requests.json()).data.sign_requests[0] as { document?: { id?: number } } | undefined;
  expect(signRequest?.document?.id).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto(`/documents/${signRequest!.document!.id}/flow#discussion`);
  await expect(page.locator('#discussion').getByRole('heading', { name: 'Thảo luận' })).toBeVisible();
  await expect(page.getByPlaceholder('Viết bình luận cho luồng phê duyệt/ký...')).toBeVisible();
});
