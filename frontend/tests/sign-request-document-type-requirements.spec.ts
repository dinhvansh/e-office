import { expect, test } from "@playwright/test";

const session = {
  tokens: { accessToken: "sign-request-type-requirements" },
  user: { id: 1, email: "admin@example.test", role: "super_admin" },
  tenant: { id: 1, name: "Requirements", plan: "test", status: "active" },
  permissions: ["sign_requests:create", "sign_requests:read", "documents:read"],
};

test("create sign request hides unsupported types and blocks digital signing without a signer", async ({ page }) => {
  await page.addInitScript((value) => localStorage.setItem("esign.auth", JSON.stringify(value)), session);
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/document-types")) {
      expect(url.searchParams.get("purpose")).toBe("sign_request");
      return route.fulfill({ contentType: "application/json", body: JSON.stringify([
        { id: 1, name: "Phê duyệt", code: "PD", is_active: true, require_approval: true, require_digital_signing: false, default_workflow_id: null, allow_workflow_override: false },
        { id: 2, name: "Ký số", code: "KS", is_active: true, require_approval: false, require_digital_signing: true, default_workflow_id: null, allow_workflow_override: false },
        { id: 3, name: "Ký và duyệt", code: "KD", is_active: true, require_approval: true, require_digital_signing: true, default_workflow_id: 30, allow_workflow_override: false },
        { id: 4, name: "Không workflow", code: "KW", is_active: true, require_approval: false, require_digital_signing: false, default_workflow_id: null, allow_workflow_override: false },
      ]) });
    }
    if (url.pathname.endsWith("/workflows")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ workflows: [{
        id: 30,
        is_active: true,
        steps: [
          { id: 1, step_name: "Phê duyệt", participant_role: "approver", approver_id: 10 },
          { id: 2, step_name: "Ký nội bộ", participant_role: "signer", approver_id: 11 },
        ],
      }] }) });
    }
    if (url.pathname.endsWith("/external-orgs")) return route.fulfill({ contentType: "application/json", body: "[]" });
    if (url.pathname.endsWith("/users/active")) return route.fulfill({ contentType: "application/json", body: JSON.stringify([
      { id: 91, full_name: "Người ký nội bộ", email: "internal@example.test", status: "active" },
    ]) });
    if (url.pathname.endsWith("/roles/my-permissions")) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: [] }) });
    return route.fulfill({ contentType: "application/json", body: "[]" });
  });

  await page.goto("/sign-requests/create");
  await page.locator("#file-upload").setInputFiles({ name: "sign.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await page.getByRole("combobox").click();
  await expect(page.getByRole("option", { name: "Không workflow (KW)" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Phê duyệt (PD)" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Ký số (KS)" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Ký và duyệt (KD)" })).toBeVisible();
  await page.getByRole("option", { name: "Ký số (KS)" }).click();

  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Loại văn bản này không yêu cầu phê duyệt.")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Loại văn bản này cần ít nhất một người ký nội bộ hoặc bên ngoài.")).toBeVisible();
  await expect(page.getByText("3. Người ký và thông tin bổ sung")).toBeVisible();
  await expect(page.getByText("Chỉ cần ít nhất một người ký hợp lệ thuộc một trong hai nhóm.")).toBeVisible();

  await page.getByRole("button", { name: "Thêm người ký nội bộ" }).first().click();
  await page.getByRole("button", { name: "-- Chọn người ký --" }).click();
  await page.getByRole("button", { name: /Người ký nội bộ/ }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Rà soát trước khi tạo")).toBeVisible();
  await expect(page.getByText("0 bên ngoài, 1 nội bộ")).toBeVisible();
});
