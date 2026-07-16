import { expect, test, type Page } from "@playwright/test";

const credentials = { email: process.env.PLAYWRIGHT_EMAIL ?? "", password: process.env.PLAYWRIGHT_PASSWORD ?? "" };
const apiBase = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";

async function callApi(page: Page, path: string, init: RequestInit = {}) {
  return page.evaluate(async ({ apiBase, path, init }) => {
    const raw = localStorage.getItem("esign.auth");
    const token = raw ? JSON.parse(raw)?.tokens?.accessToken : undefined;
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return { status: response.status, body: await response.json() };
  }, { apiBase, path, init });
}

test("UAT users: admin creates a user through the UI with organizational assignments", async ({ page }) => {
  test.skip(!credentials.email || !credentials.password, "PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required for real UAT data");
  const suffix = Date.now().toString();
  const email = `uat-user-${suffix}@example.test`;
  const department = await (async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(credentials.email);
    await page.locator('input[type="password"]').fill(credentials.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/$/);
    return callApi(page, "/departments", { method: "POST", body: JSON.stringify({ name: `UAT Users Dept ${suffix}`, code: `USR${suffix.slice(-6)}` }) });
  })();
  expect(department.status).toBe(201);
  const position = await callApi(page, "/positions", { method: "POST", body: JSON.stringify({ name: `UAT Users Position ${suffix}`, code: `UP${suffix.slice(-6)}`, level: 1 }) });
  expect(position.status).toBe(201);
  const roles = await callApi(page, "/roles");
  const userRole = roles.body.data.find((role: { name: string }) => role.name === "User");
  expect(userRole).toBeTruthy();

  await page.goto("/users");
  await page.getByRole("button", { name: "Thêm người dùng" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#email").fill(email);
  await dialog.locator("#password").fill("UatUser1A");
  await dialog.locator("#full_name").fill(`UAT User ${suffix}`);
  await dialog.locator("#department_id").selectOption(String(department.body.data.id));
  await dialog.locator("#position_id").selectOption(String(position.body.data.position.id));
  await dialog.getByText("User", { exact: true }).click();
  await dialog.getByRole("button", { name: "Tạo" }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  const users = await callApi(page, `/users?search=${encodeURIComponent(email)}`);
  expect(users.status).toBe(200);
  const created = users.body.data.find((user: { email: string }) => user.email === email);
  expect(created).toMatchObject({ email, department_id: department.body.data.id, position_id: position.body.data.position.id });
  expect(created.user_roles.map((item: { role: { id: number } }) => item.role.id)).toContain(userRole.id);

  const userContext = await page.context().browser()!.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  const userPage = await userContext.newPage();
  await userPage.goto("/login");
  await userPage.getByLabel("Email").fill(email);
  await userPage.locator('input[type="password"]').fill("UatUser1A");
  await userPage.locator('button[type="submit"]').click();
  await expect(userPage).toHaveURL(/\/$/);
  const changedPassword = await callApi(userPage, "/users/change-password", {
    method: "POST",
    body: JSON.stringify({ old_password: "UatUser1A", new_password: "UatUser2B" }),
  });
  expect(changedPassword.status).toBe(200);
  await userContext.close();

  const updated = await callApi(page, `/users/${created.id}`, {
    method: "PUT",
    body: JSON.stringify({ full_name: `UAT User Updated ${suffix}`, status: "inactive" }),
  });
  expect(updated.status).toBe(200);
  expect(updated.body.data).toMatchObject({ full_name: `UAT User Updated ${suffix}`, status: "inactive" });
  const reactivated = await callApi(page, `/users/${created.id}`, { method: "PUT", body: JSON.stringify({ status: "active" }) });
  expect(reactivated.status).toBe(200);
  expect(reactivated.body.data.status).toBe("active");

  expect((await callApi(page, "/users", {
    method: "POST",
    body: JSON.stringify({ email, password: "UatUser1A", full_name: "Duplicate", department_id: department.body.data.id, role_ids: [userRole.id] }),
  })).status).toBe(400);
  expect((await callApi(page, "/users", {
    method: "POST",
    body: JSON.stringify({ email: `invalid-dept-${suffix}@example.test`, password: "UatUser1A", full_name: "Invalid department", department_id: 99999999, role_ids: [userRole.id] }),
  })).status).toBe(400);
  expect((await callApi(page, "/users", {
    method: "POST",
    body: JSON.stringify({ email: `invalid-role-${suffix}@example.test`, password: "UatUser1A", full_name: "Invalid role", department_id: department.body.data.id, role_ids: [99999999] }),
  })).status).toBe(400);

  const referencedDepartmentDeletion = await callApi(page, `/departments/${department.body.data.id}`, { method: "DELETE" });
  expect(referencedDepartmentDeletion.status).toBe(400);
  expect(referencedDepartmentDeletion.body.error).toMatchObject({ code: "DEPARTMENT_HAS_USERS" });
  const deleted = await callApi(page, `/users/${created.id}`, { method: "DELETE" });
  expect(deleted.status).toBe(200);
  expect((await callApi(page, `/departments/${department.body.data.id}`, { method: "DELETE" })).status).toBe(200);
  expect((await callApi(page, `/positions/${position.body.data.position.id}`, { method: "DELETE" })).status).toBe(200);
});
