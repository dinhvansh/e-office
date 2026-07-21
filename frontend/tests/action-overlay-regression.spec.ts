import { expect, test, type Page } from "@playwright/test";

const session = {
  tokens: { accessToken: "action-overlay" },
  user: { id: 1, email: "admin@example.test", role: "super_admin" },
  tenant: { id: 1, name: "Overlay", plan: "test", status: "active" },
  permissions: ["sign_requests:read", "sign_requests:update", "sign_requests:delete"],
};

const draftRequest = {
  id: 21,
  status: "draft",
  flow_state: "DRAFT",
  created_at: new Date().toISOString(),
  document: {
    id: 21,
    title: "Overlay regression",
    original_file_name: "overlay.pdf",
    document_number: "OVERLAY-21",
    status: "draft",
    owner: { id: 1, full_name: "Admin", email: "admin@example.test" },
  },
  signers: [{
    id: 9,
    name: "External signer",
    email: "external@example.test",
    status: "pending",
    signed_at: null,
    signing_order: 1,
    is_internal: false,
    user_id: null,
  }],
  progress: { total: 1, signed: 0, rejected: 0, pending: 1, percentage: 0 },
};

async function prepare(page: Page) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("esign.auth", JSON.stringify(value));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text: string) => window.sessionStorage.setItem("copied-link", text) },
    });
  }, session);

  await page.route("http://127.0.0.1:4010/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/sign-requests/my-requests")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ sign_requests: [draftRequest], pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false } }),
      });
    }
    if (url.pathname.endsWith("/sign-requests/21") && route.request().method() === "GET") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ signers: [{ ...draftRequest.signers[0], signing_token: "overlay-token" }] }) });
    }
    if (url.pathname.endsWith("/sign-requests/21") && route.request().method() === "DELETE") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true }) });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({}) });
  });

  await page.goto("/sign-requests");
}

async function openActions(page: Page) {
  const row = page.locator("tr").filter({ hasText: "OVERLAY-21" });
  await row.locator("button").last().click();
  await expect(page.getByRole("menu")).toBeVisible();
}

async function expectPageInteractive(page: Page) {
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).pointerEvents)).not.toBe("none");
  const search = page.getByPlaceholder(/Tìm theo tên tài liệu|Search by document/i);
  await search.fill("interactive");
  await expect(search).toHaveValue("interactive");
  await search.clear();
}

test("copy link closes the action menu without leaving the page blocked", async ({ page }) => {
  await prepare(page);
  await openActions(page);
  await page.getByRole("menuitem", { name: /Copy link/i }).click();
  await expect(page.getByText(/Đã sao chép link ký|Signing link copied/i)).toBeVisible();
  await expectPageInteractive(page);
});

test("destructive action opens after the menu closes and releases the page lock", async ({ page }) => {
  await prepare(page);
  await openActions(page);
  await page.getByRole("menuitem", { name: /Xóa bản nháp|Delete draft/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Xóa bản nháp|Delete draft/i }).click();
  await expect(dialog).toHaveCount(0);
  await expectPageInteractive(page);
});
