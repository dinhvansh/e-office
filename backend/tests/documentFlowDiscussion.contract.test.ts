import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("an active approver receives task-scoped discussion access in the document flow", () => {
  const flow = read("src/modules/documentFlow/documentFlow.service.ts");
  const discussion = read("../frontend/components/sign-requests/sign-request-discussion.tsx");

  assert.match(flow, /activeApprovalForCurrentUser/);
  assert.match(flow, /active_approval_id: activeApprovalForCurrentUser\?\.id \|\| null/);
  assert.match(discussion, /\/approvals\/\$\{activeApprovalId\}\/comments/);
  assert.match(discussion, /attachments,/);
});

test("legacy approvals without a persisted workflow run remain visible", () => {
  const flow = read("src/modules/documentFlow/documentFlow.service.ts");
  assert.match(flow, /const visibleApprovals = currentWorkflowInstance/);
  assert.match(flow, /approval\.workflow_instance_id == null/);
});

test("mixed approval/signing timelines preserve their persisted workflow order", () => {
  const flow = read("src/modules/documentFlow/documentFlow.service.ts");

  assert.doesNotMatch(flow, /let orderCounter = 1/);
  assert.match(flow, /order: approval\.workflow_step\.step_order/);
  assert.match(flow, /order: signer\.signing_order \?\? \+\+fallbackSignerOrder/);
  assert.match(flow, /steps\.sort\(/);
});
