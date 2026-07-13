import assert from "node:assert/strict";
import test from "node:test";
import { isApprovalStepComplete } from "../src/modules/approvals/approvalCompletion.policy";

test("all mode completes only after every approver approves", () => {
  assert.equal(isApprovalStepComplete(["approved", "pending"], "all"), false);
  assert.equal(isApprovalStepComplete(["approved", "approved"], "all"), true);
});

test("any_one mode completes after the first approval", () => {
  assert.equal(isApprovalStepComplete(["approved", "pending"], "any_one"), true);
});

test("min_n mode completes only at the configured threshold", () => {
  assert.equal(isApprovalStepComplete(["approved", "pending", "pending"], "min_n", 2), false);
  assert.equal(isApprovalStepComplete(["approved", "approved", "pending"], "min_n", 2), true);
});
