import { expect, test, type Page } from "@playwright/test";
import { getDocumentLifecycleActions, getSignRequestLifecycleActions } from "../lib/document-lifecycle";

const session = {
  tokens: { accessToken: "lifecycle-actions" },
  user: { id: 1, email: "admin@example.test", role: "super_admin" },
  tenant: { id: 1, name: "Lifecycle", plan: "test", status: "active" },
  permissions: ["documents:read", "documents:update", "documents:delete", "sign_requests:read", "sign_requests:update", "sign_requests:delete"],
};

const document = (id: number, status: string) => ({
  id,
  tenant_id: 1,
  owner_id: 1,
  title: `Document ${status}`,
  original_file_name: `${status}.pdf`,
  file_path: `${status}.pdf`,
  status,
  version: 1,
  created_at: new Date().toISOString(),
  document_number: `DOC-${id}`,
  confidential_level: "normal",
  priority_level: "normal",
  sign_request_id: status === "draft" ? null : id,
});

const request = (id: number, status: string, flowState: string) => ({
  id,
  status,
  flow_state: flowState,
  created_at: new Date().toISOString(),
  document: { ...document(id, status), owner: { id: 1, full_name: "Admin", email: "admin@example.test" } },
  signers: [],
  progress: { total: 0, signed: 0, rejected: status === "rejected" ? 1 : 0, pending: 0, percentage: status === "completed" ? 100 : 0 },
});

async function authenticate(page: Page) {
  await page.addInitScript((value) => window.localStorage.setItem("esign.auth", JSON.stringify(value)), session);
}

test("lifecycle helpers distinguish draft, terminal, active and completed states", () => {
  expect(getDocumentLifecycleActions("draft")).toEqual({ canDelete: true, canArchive: false, canCancel: false });
  expect(getDocumentLifecycleActions("cancelled")).toEqual({ canDelete: false, canArchive: true, canCancel: false });
  expect(getDocumentLifecycleActions("rejected")).toEqual({ canDelete: false, canArchive: true, canCancel: false });
  expect(getDocumentLifecycleActions("pending_approval")).toEqual({ canDelete: false, canArchive: false, canCancel: true });
  expect(getDocumentLifecycleActions("completed")).toEqual({ canDelete: false, canArchive: false, canCancel: false });
  expect(getSignRequestLifecycleActions("completed", "COMPLETED")).toEqual({ canDelete: false, canArchive: false, canCancel: false });
});

test("Documents hides lifecycle mutations for completed and exposes only valid actions", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/documents?")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ documents: [document(1, "completed"), document(2, "cancelled"), document(3, "pending_approval"), document(4, "draft")], pagination: { page: 1, limit: 10, total: 4, totalPages: 1 } }) });
    if (url.includes("/document-types") || url.includes("/workflows")) return route.fulfill({ contentType: "application/json", body: "[]" });
    return route.fulfill({ contentType: "application/json", body: "{}" });
  });

  await page.goto("/documents");
  const completed = page.locator("tr").filter({ hasText: "completed.pdf" });
  await expect(completed.getByTitle("Xóa")).toHaveCount(0);
  await expect(completed.getByTitle("Lưu trữ")).toHaveCount(0);
  await expect(completed.getByTitle("Hủy tài liệu")).toHaveCount(0);
  await expect(page.locator("tr").filter({ hasText: "cancelled.pdf" }).getByTitle("Lưu trữ")).toBeVisible();
  await expect(page.locator("tr").filter({ hasText: "pending_approval.pdf" }).getByTitle("Hủy tài liệu")).toBeVisible();
  await expect(page.locator("tr").filter({ hasText: "draft.pdf" }).getByTitle("Xóa")).toBeVisible();
});

test("Sign Requests hides completed mutations and separates archive from cancel", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/sign-requests/my-requests")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ sign_requests: [{ ...request(11, "completed", "COMPLETED"), signers: [{ id: 1, name: "External", email: "external@example.test", status: "completed", signed_at: new Date().toISOString(), signing_order: 1, is_internal: false, user_id: null }] }, request(12, "cancelled", "CANCELLED"), request(13, "rejected", "REJECTED"), request(14, "in_progress", "AWAITING_SIGNATURES")], pagination: { page: 1, limit: 10, total: 4, totalPages: 1, hasNext: false, hasPrev: false } }) });
    return route.fulfill({ contentType: "application/json", body: "[]" });
  });

  await page.goto("/sign-requests");
  const completed = page.locator("tr").filter({ hasText: "DOC-11" });
  await expect(completed.locator('[aria-haspopup="menu"]')).toHaveCount(0);
  const openMenu = async (id: number) => {
    const row = page.locator("tr").filter({ hasText: `DOC-${id}` });
    await row.getByRole("button", { name: "Thao tác khác" }).click();
    return page.getByRole("menu");
  };
  let menu = await openMenu(12);
  await expect(menu.getByText("Lưu trữ", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  menu = await openMenu(13);
  await expect(menu.getByText("Lưu trữ", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  menu = await openMenu(14);
  await expect(menu.getByText("Hủy luồng ký", { exact: true })).toBeVisible();
  await expect(menu.getByText("Lưu trữ", { exact: true })).toHaveCount(0);
});
