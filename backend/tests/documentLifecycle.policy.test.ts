import assert from "node:assert/strict";
import test from "node:test";
import { canCancelDocumentStatus, canHardDeleteDocumentStatus } from "../src/modules/documents/documentLifecycle.policy";

test("characterizes hard-delete and cancellation document status boundaries", () => {
  assert.equal(canHardDeleteDocumentStatus("draft"), true);
  assert.equal(canHardDeleteDocumentStatus("cancelled"), true);
  assert.equal(canHardDeleteDocumentStatus("completed"), false);
  assert.equal(canCancelDocumentStatus("pending_approval"), true);
  assert.equal(canCancelDocumentStatus("in_progress"), true);
  assert.equal(canCancelDocumentStatus("completed"), false);
  assert.equal(canCancelDocumentStatus("archived"), false);
});
