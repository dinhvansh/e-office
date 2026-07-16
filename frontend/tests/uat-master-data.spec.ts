import { expect, test } from "@playwright/test";

const credentials = {
  email: process.env.PLAYWRIGHT_EMAIL ?? "admin@acme.local",
  password: process.env.PLAYWRIGHT_PASSWORD ?? "",
};

test.describe.configure({ mode: "serial" });

test("UAT master data: admin selects a real document type and creates a numbered document", async ({ page }) => {
  test.skip(!credentials.password, "PLAYWRIGHT_PASSWORD is required for real UAT data");

  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Mật khẩu").fill(credentials.password);
  await page.getByRole("button", { name: /đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Tài liệu gần đây")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem("esign.auth");
    return raw ? Boolean(JSON.parse(raw)?.tokens?.accessToken) : false;
  })).toBe(true);

  await page.goto("/documents");
  await page.locator("#file-upload-input").setInputFiles({
    name: "uat-master-data.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF"),
  });
  await expect(page.getByText("uat-master-data.pdf")).toBeVisible();

  const typePicker = page.getByRole("button", { name: /chọn loại văn bản/i });
  await expect(typePicker).toHaveAttribute("aria-haspopup", "listbox");
  await typePicker.click();
  const typeOptions = page.locator('[role="listbox"] [role="option"]');
  await expect(typeOptions).not.toHaveCount(0);
  await typeOptions.first().click();

  const title = `UAT master data ${Date.now()}`;
  await page.locator("#file-name").fill(title);
  await page.getByRole("button", { name: /^tải tài liệu$/i }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("table")).toContainText(title);
  await expect(page.getByRole("table")).toContainText(/\d{3}\/\d{4}/);
});
