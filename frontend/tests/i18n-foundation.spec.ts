import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_LOCALE, normalizeLocale, resolveMessage, translate, type Translator } from "../i18n";
import { viMessages } from "../i18n/locales/vi";
import { getApprovalStatusLabel, getDocumentStatusMeta, getSignRequestStatusMeta } from "../lib/status-localization";

const session = {
  tokens: { accessToken: "i18n-foundation" },
  user: { id: 1, email: "admin@example.test", full_name: "Admin", role: "super_admin" },
  tenant: { id: 1, name: "Localization", plan: "test", status: "active" },
  permissions: ["archive:view", "archive:restore", "workflows:read", "workflows:create"],
};

const archivedDocument = {
  id: 17,
  title: "Hợp đồng lưu trữ",
  document_number: "DOC-17",
  previous_status: "cancelled",
  archived_at: "2026-07-20T02:30:00.000Z",
  archived_by: 1,
  sign_request: { id: 42 },
};

async function prepare(page: Page, storedLocale?: string) {
  await page.addInitScript(({ auth, locale }) => {
    window.localStorage.setItem("esign.auth", JSON.stringify(auth));
    if (locale !== undefined) window.localStorage.setItem("esign.locale", locale);
  }, { auth: session, locale: storedLocale });
  await page.route("http://127.0.0.1:4010/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/roles/my-permissions")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: [
        { resource: "archive", action: "view" },
        { resource: "archive", action: "restore" },
        { resource: "workflows", action: "read" },
        { resource: "workflows", action: "create" },
      ] }) });
    }
    if (url.pathname.endsWith("/archive/documents")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ documents: [archivedDocument] }) });
    }
    if (url.pathname.endsWith("/workflows")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ workflows: [] }) });
    }
    if (url.pathname.endsWith("/users") || url.pathname.endsWith("/departments")) {
      return route.fulfill({ contentType: "application/json", body: "[]" });
    }
    if (url.pathname.endsWith("/positions")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ positions: [] }) });
    }
    return route.fulfill({ contentType: "application/json", body: "{}" });
  });
}

async function switchToEnglish(page: Page) {
  await page.locator("header").getByRole("button").filter({ hasText: "Admin" }).click();
  await page.getByRole("menuitem", { name: "Ngôn ngữ" }).hover();
  await page.getByRole("menuitemradio", { name: "English" }).click();
}

test("translation core defaults invalid locale to vi and safely falls back", () => {
  expect(DEFAULT_LOCALE).toBe("vi");
  expect(normalizeLocale(undefined)).toBe("vi");
  expect(normalizeLocale("fr")).toBe("vi");
  expect(normalizeLocale("en")).toBe("en");
  expect(resolveMessage({}, { "common.save": "Lưu" }, "common.save")).toBe("Lưu");
  expect(translate("en", "missing.semantic.key")).toBe("missing.semantic.key");
});

test("status helpers localize document, sign-request and approval values", () => {
  const en = ((key, values) => translate("en", key, values)) as Translator;
  expect(getDocumentStatusMeta("completed", en).label).toBe("Completed");
  expect(getSignRequestStatusMeta({ status: "cancelled" }, en).label).toBe("Cancelled");
  expect(getSignRequestStatusMeta({ flowState: "AWAITING_APPROVAL" }, en).label).toBe("Pending approval");
  expect(getApprovalStatusLabel("approved", en)).toBe("Approved");
  expect(getApprovalStatusLabel("info_requested", en)).toBe("More information requested");
});

test("Vietnamese catalog is valid UTF-8 without common mojibake markers", () => {
  const content = Object.values(viMessages).join("\n");
  expect(content).toContain("Duyệt tuần tự");
  expect(content).toContain("Khôi phục");
  expect(content).not.toMatch(/Ã.|Â.|áº|á»|Ä‘/);
});

test("default vi switches to en across sidebar/archive/workflow and persists after reload", async ({ page }) => {
  await prepare(page);
  await page.goto("/archive");

  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("heading", { name: "Lưu trữ", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Khôi phục" })).toBeVisible();
  await expect(page.locator("aside").getByText("Tổng quan", { exact: true })).toBeVisible();
  await expect(page.locator("main").getByText(/Trạng thái trước: Đã hủy/)).toBeVisible();

  await switchToEnglish(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Archive", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
  await expect(page.locator("aside").getByText("Overview", { exact: true })).toBeVisible();
  await expect(page.locator("main").getByText(/Previous status: Cancelled/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("esign.locale"))).toBe("en");

  await page.goto("/workflows");
  await page.getByRole("button", { name: /Tạo quy trình mới|Create/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Approval mode")).toContainText("Sequential approval");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("aside").getByText("Overview", { exact: true })).toBeVisible();
});

test("invalid persisted locale falls back to vi", async ({ page }) => {
  await prepare(page, "fr");
  await page.goto("/archive");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("heading", { name: "Lưu trữ", level: 1 })).toBeVisible();
});
