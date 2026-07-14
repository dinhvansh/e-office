import { expect, test, type Page } from '@playwright/test';

type RoleScenario = {
  role: string;
  permissions: string[];
  visible: string[];
  hidden: string[];
};

const scenarios: RoleScenario[] = [
  {
    role: 'super_admin',
    permissions: [],
    visible: ['/users', '/roles', '/document-types', '/settings/system', '/webhooks'],
    hidden: [],
  },
  {
    role: 'requester',
    permissions: ['documents:read', 'sign_requests:read'],
    visible: ['/documents', '/sign-requests', '/my-tasks'],
    hidden: ['/users', '/roles', '/settings/system'],
  },
  {
    role: 'approver',
    permissions: ['approvals:read'],
    visible: ['/my-tasks', '/sign-requests'],
    hidden: ['/documents', '/users', '/roles', '/settings/system'],
  },
  {
    role: 'signer',
    permissions: ['sign_requests:read'],
    visible: ['/my-tasks', '/sign-requests'],
    hidden: ['/documents', '/users', '/roles', '/settings/system'],
  },
];

async function mockApi(page: Page) {
  await page.route('http://127.0.0.1:4010/**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { documents: [], tenant: {}, notifications: [] } }) });
  });
}

async function setSession(page: Page, scenario: RoleScenario) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('esign.auth', JSON.stringify(session));
  }, {
    tokens: { accessToken: 'navigation-test-token' },
    user: { id: 1, email: `${scenario.role}@example.test`, full_name: scenario.role, role: scenario.role },
    tenant: { id: 1, name: 'UX navigation', plan: 'test', status: 'active' },
    permissions: scenario.permissions,
  });
}

for (const scenario of scenarios) {
  test(`${scenario.role} sees the same permitted destinations on desktop and mobile`, async ({ page }) => {
    await mockApi(page);
    await setSession(page, scenario);
    await page.goto('/');

    const desktopSidebar = page.locator('aside');
    await expect(desktopSidebar).toBeVisible();
    for (const href of scenario.visible) await expect(desktopSidebar.locator(`a[href="${href}"]`)).toBeVisible();
    for (const href of scenario.hidden) await expect(desktopSidebar.locator(`a[href="${href}"]`)).toHaveCount(0);
    if (scenario.role === 'super_admin') {
      await page.screenshot({ path: '../docs/ux/evidence/ux015-super-admin-desktop-after-fix.png', fullPage: true });
    }

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(desktopSidebar).toBeVisible();
    if (scenario.role === 'super_admin') {
      await page.screenshot({ path: '../docs/ux/evidence/ux015-super-admin-tablet-after-fix.png', fullPage: true });
    }

    await page.setViewportSize({ width: 375, height: 812 });
    const mobileNav = page.getByRole('navigation', { name: 'Điều hướng chính trên thiết bị di động' });
    await expect(mobileNav).toBeVisible();
    for (const href of scenario.hidden) await expect(mobileNav.locator(`a[href="${href}"]`)).toHaveCount(0);

    const moreButton = page.getByRole('button', { name: 'Mở thêm mục điều hướng' });
    if (await moreButton.count()) await moreButton.click();
    for (const href of scenario.visible) await expect(page.locator(`a[href="${href}"]`).last()).toBeVisible();
    await page.screenshot({ path: `../docs/ux/evidence/ux015-${scenario.role}-mobile-after-fix.png`, fullPage: true });
  });
}

test('super_admin can reach an admin destination through the mobile overflow with keyboard focus', async ({ page }) => {
  const scenario = scenarios[0];
  await mockApi(page);
  await setSession(page, scenario);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const moreButton = page.getByRole('button', { name: 'Mở thêm mục điều hướng' });
  await moreButton.focus();
  await expect(moreButton).toBeFocused();
  await page.keyboard.press('Enter');
  const usersLink = page.locator('a[href="/users"]').last();
  await expect(usersLink).toBeVisible();
  await usersLink.focus();
  await expect(usersLink).toBeFocused();
  await page.screenshot({ path: '../docs/ux/evidence/ux015-super-admin-mobile-overflow-after-fix.png', fullPage: true });
});

test('an unauthenticated direct admin route remains redirected to login', async ({ page }) => {
  await mockApi(page);
  await page.goto('/users');
  await expect(page).toHaveURL(/\/login$/);
});
