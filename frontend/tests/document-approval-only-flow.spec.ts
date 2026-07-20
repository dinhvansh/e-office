import { expect, test } from "@playwright/test";

const session = {
  tokens: { accessToken: "approval-only-flow" },
  user: { id: 1, email: "owner@example.test", full_name: "Owner", role: "super_admin" },
  tenant: { id: 1, name: "Flow UX", plan: "test", status: "active" },
  permissions: ["documents:read"],
};

const approvals = [1, 2, 3].map((order) => ({
  id: order,
  step_order: order,
  step_name: `Bước ${order}`,
  actor: `Người duyệt ${order}`,
  action: "approved",
  acted_at: `2026-07-20T0${order + 3}:00:00.000Z`,
  comment: order === 3 ? "Đồng ý hoàn tất" : null,
}));

test("approval-only completed document keeps flow history, progress and downloads the original artifact", async ({ page }) => {
  await page.addInitScript((auth) => localStorage.setItem("esign.auth", JSON.stringify(auth)), session);
  let downloadedEndpoint = "";

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/documents/1/flow")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({
        document: { id: 1, title: "Approval only", document_number: "DOC-001", original_file_name: "approval-only.pdf", status: "completed", sign_request_id: 1, document_type: "Hợp đồng", signed_file_path: null, owner: { id: 1, name: "Owner", email: "owner@example.test" } },
        phases: [{ key: "approval", label: "Phê duyệt", status: "completed" }],
        steps: approvals.map((item) => ({ id: `approval-${item.id}`, type: "approval", order: item.step_order, user: { id: item.id, name: item.actor, email: `approver${item.id}@example.test` }, status: "approved", completed_at: item.acted_at })),
        activities: [],
        workflow_runs: [{ id: 10, run_number: 1, status: "completed", workflow_name: "Duyệt hợp đồng", started_at: "2026-07-20T03:00:00.000Z", completed_at: "2026-07-20T06:00:00.000Z", approvals }],
        status_summary: { status: "completed", current_actor: null, next_action: "REVIEW_STATUS", progress: { completed: 3, total: 3, kind: "approval" }, deadline: null, can_retry_artifact: false },
        can_approve: false, can_sign: false, can_manage_sign_request: true, can_share: false, can_view_audit: true,
      }) });
    }
    if (url.pathname.endsWith("/documents/1/download")) {
      downloadedEndpoint = url.pathname;
      return route.fulfill({ contentType: "application/pdf", body: "%PDF-1.4\n%%EOF" });
    }
    if (url.pathname.includes("/documents/1/download-signed")) {
      downloadedEndpoint = url.pathname;
      return route.fulfill({ status: 404, body: "signed artifact missing" });
    }
    if (url.pathname.endsWith("/documents/1/view")) return route.fulfill({ contentType: "application/pdf", body: "%PDF-1.4\n%%EOF" });
    if (url.pathname.endsWith("/documents/1/attachments")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ attachments: [], can_upload: false }) });
    if (url.pathname.endsWith("/roles/my-permissions")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: [] }) });
    if (url.pathname.endsWith("/users") || url.pathname.endsWith("/departments")) return route.fulfill({ contentType: "application/json", body: "[]" });
    if (url.pathname.endsWith("/positions")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ positions: [] }) });
    return route.fulfill({ contentType: "application/json", body: "{}" });
  });

  await page.goto("/documents/1/flow");
  await expect(page.getByText("3/3 bước đã phê duyệt")).toBeVisible();
  await expect(page.getByTestId("workflow-run-1")).toContainText("Lần chạy 1");
  await expect(page.getByTestId("workflow-run-1")).toContainText("Người duyệt 3");
  await page.getByRole("button", { name: "Tải xuống" }).click();
  await page.getByRole("menuitem", { name: "Tải tài liệu" }).click();
  await expect.poll(() => downloadedEndpoint).toBe("/api/v1/documents/1/download");
});
