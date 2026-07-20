import { expect, test } from "@playwright/test";

const session = {
  tokens: { accessToken: "approval-progress" },
  user: { id: 1, email: "owner@example.test", full_name: "Owner", role: "super_admin" },
  tenant: { id: 1, name: "Approval Progress", plan: "test", status: "active" },
  permissions: ["sign_requests:read"],
};

test("approval-only completed request displays latest workflow run progress", async ({ page }) => {
  await page.addInitScript((auth) => localStorage.setItem("esign.auth", JSON.stringify(auth)), session);
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/sign-requests/my-requests")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({
        sign_requests: [{
          id: 91,
          status: "completed",
          flow_state: "COMPLETED",
          created_at: "2026-07-20T08:00:00.000Z",
          document: { id: 91, title: "Approval only", original_file_name: "approval-only.pdf", document_number: "DOC-091", status: "completed", document_type: "Hợp đồng", owner: { id: 1, full_name: "Owner", email: "owner@example.test" } },
          signers: [],
          progress: { total: 3, signed: 3, rejected: 0, pending: 0, percentage: 100, kind: "approval" },
        }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      }) });
    }
    return route.fulfill({ contentType: "application/json", body: "{}" });
  });

  await page.goto("/sign-requests");
  await expect(page.getByRole("heading", { name: "Yêu cầu Ký duyệt" })).toBeVisible();
  const row = page.locator("tr").filter({ hasText: "DOC-091" });
  await expect(row).toContainText("3/3");
  await expect(row).toContainText("Hợp đồng");
});
