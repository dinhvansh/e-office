import { expect, test, type Page } from "@playwright/test";

type WorkflowFixture = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  approval_mode?: "sequential" | "parallel";
  steps: Array<{
    id: number;
    step_order: number;
    step_name: string;
    approver_type: "user";
    participant_role: "approver";
    due_in_days: number;
    is_required: boolean;
  }>;
};

const session = {
  tokens: { accessToken: "workflow-list-flow" },
  user: { id: 1, email: "admin@example.test", full_name: "Admin", role: "super_admin" },
  tenant: { id: 1, name: "Workflow UX", plan: "test", status: "active" },
  permissions: [],
};

const steps = (names: string[], idOffset = 0) => names.map((stepName, index) => ({
  id: idOffset + index + 1,
  step_order: index + 1,
  step_name: stepName,
  approver_type: "user" as const,
  participant_role: "approver" as const,
  due_in_days: 2,
  is_required: true,
}));

function workflow(
  id: number,
  name: string,
  approvalMode: "sequential" | "parallel" | undefined,
  approvalSteps: WorkflowFixture["steps"],
): WorkflowFixture {
  return {
    id,
    name,
    description: `Mô tả ${name}`,
    is_active: true,
    approval_mode: approvalMode,
    steps: approvalSteps,
  };
}

async function prepare(page: Page, initialWorkflows: WorkflowFixture[]) {
  const workflows = structuredClone(initialWorkflows);
  await page.addInitScript((auth) => window.localStorage.setItem("esign.auth", JSON.stringify(auth)), session);
  await page.route("http://127.0.0.1:4010/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const detailMatch = url.pathname.match(/\/workflows\/(\d+)$/);

    if (url.pathname.endsWith("/roles/my-permissions")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: [] }) });
    }
    if (detailMatch && method === "GET") {
      const selected = workflows.find((item) => item.id === Number(detailMatch[1]));
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ workflow: selected }) });
    }
    if (detailMatch && method === "PUT") {
      const selected = workflows.find((item) => item.id === Number(detailMatch[1]));
      Object.assign(selected || {}, route.request().postDataJSON());
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(selected) });
    }
    if (url.pathname.endsWith("/workflows") && method === "GET") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ workflows }) });
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

const visibleFlow = (page: Page, workflowId: number) =>
  page.locator(`[data-testid="workflow-flow-${workflowId}"]:visible`);

test("workflow list distinguishes sequential, parallel, legacy and empty flows", async ({ page }) => {
  await prepare(page, [
    workflow(1, "Tuần tự", "sequential", steps(["Trưởng phòng", "Giám đốc", "CEO"])),
    workflow(2, "Song song", "parallel", steps(["Pháp chế", "Tài chính", "Vận hành"], 10)),
    workflow(3, "Legacy", undefined, steps(["Bước cũ"], 20)),
    workflow(4, "Chưa cấu hình", "parallel", []),
  ]);

  await page.goto("/workflows");

  const sequential = visibleFlow(page, 1);
  await expect(sequential).toContainText("Duyệt tuần tự");
  await expect(sequential).toContainText("Trưởng phòng");
  await expect(sequential).toContainText("Giám đốc");
  await expect(sequential.getByTestId("sequential-connector")).toHaveCount(2);

  const parallel = visibleFlow(page, 2);
  await expect(parallel).toContainText("Duyệt song song");
  await expect(parallel).toContainText("Đồng thời");
  await expect(parallel.getByTestId("parallel-flow")).toBeVisible();
  await expect(parallel.getByTestId("sequential-connector")).toHaveCount(0);

  await expect(visibleFlow(page, 3)).toContainText("Duyệt tuần tự");
  await expect(visibleFlow(page, 4)).toContainText("Chưa cấu hình bước duyệt");
});

test("quick preview reuses the detailed workflow preview", async ({ page }) => {
  await prepare(page, [workflow(5, "Preview nhanh", "parallel", steps(["A", "B"], 30))]);
  await page.goto("/workflows");

  await visibleFlow(page, 5).getByRole("button", { name: "Xem luồng của Preview nhanh" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Luồng phê duyệt: Preview nhanh" })).toBeVisible();
  await expect(dialog.getByText("Duyệt song song")).toBeVisible();
  await expect(dialog.getByText("Đồng thời").first()).toBeVisible();
});

test("editing between sequential and parallel refreshes the list immediately", async ({ page }) => {
  await prepare(page, [workflow(6, "Đổi chế độ", "sequential", steps(["A", "B"], 40))]);
  await page.goto("/workflows");

  await page.locator("tr").filter({ hasText: "Đổi chế độ" }).getByTitle("Chỉnh sửa").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Chế độ duyệt").click();
  await page.getByRole("option", { name: "Duyệt song song" }).click();
  await dialog.getByRole("button", { name: "Lưu" }).click();

  await expect(visibleFlow(page, 6)).toContainText("Duyệt song song");
  await expect(visibleFlow(page, 6)).toContainText("Đồng thời");
  await expect(visibleFlow(page, 6).getByTestId("sequential-connector")).toHaveCount(0);

  await page.locator("tr").filter({ hasText: "Đổi chế độ" }).getByTitle("Chỉnh sửa").click();
  await page.getByRole("dialog").getByLabel("Chế độ duyệt").click();
  await page.getByRole("option", { name: "Duyệt tuần tự" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();

  await expect(visibleFlow(page, 6)).toContainText("Duyệt tuần tự");
  await expect(visibleFlow(page, 6).getByTestId("sequential-connector")).toHaveCount(1);
});

test("language switch updates flow labels and mobile layout does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await prepare(page, [workflow(7, "Mobile", "parallel", steps(["A", "B", "C", "D", "E", "F"], 50))]);
  await page.goto("/workflows");

  const flow = visibleFlow(page, 7);
  await expect(flow).toContainText("Duyệt song song");
  await expect(flow).toContainText("+1");
  await page.locator("header").getByRole("button").filter({ hasText: "Admin" }).click();
  await page.getByRole("menuitem", { name: "Ngôn ngữ" }).hover();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  await expect(flow).toContainText("Parallel approval");
  await expect(flow).toContainText("At the same time");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
