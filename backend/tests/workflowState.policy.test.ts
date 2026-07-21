import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionDocumentStatus } from "../src/modules/workflows/workflowState.policy";

test("allows document signing to enter artifact generation", () => {
  assert.equal(canTransitionDocumentStatus("pending_signature", "generating_artifact"), true);
  assert.equal(canTransitionDocumentStatus("in_progress", "generating_artifact"), true);
});

test("requires an approval-only workflow to generate its artifact before completion", () => {
  assert.equal(canTransitionDocumentStatus("pending_approval", "generating_artifact"), true);
  assert.equal(canTransitionDocumentStatus("pending_approval", "completed"), false);
  assert.equal(canTransitionDocumentStatus("generating_artifact", "completed"), true);
});

test("rejects invalid document workflow transitions", () => {
  assert.equal(canTransitionDocumentStatus("draft", "completed"), false);
  assert.equal(canTransitionDocumentStatus("completed", "pending_signature"), false);
  assert.equal(canTransitionDocumentStatus("cancelled", "draft"), false);
});
