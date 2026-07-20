import assert from "node:assert/strict";
import test from "node:test";
import {
  canArchiveDocumentStatus,
  canCancelDocumentStatus,
  canHardDeleteDocumentStatus,
  getDocumentDeleteDisposition,
} from "../src/modules/documents/documentLifecycle.policy";

test("draft without lifecycle history is hard deleted", () => {
  assert.equal(canHardDeleteDocumentStatus("draft"), true);
  assert.equal(canHardDeleteDocumentStatus("cancelled"), false);
  assert.equal(getDocumentDeleteDisposition("draft", false), "hard_delete");
});

test("draft with lifecycle history is never hard deleted or archived", () => {
  assert.equal(getDocumentDeleteDisposition("draft", true), "deny");
});

test("rejected and cancelled documents are archived", () => {
  assert.equal(getDocumentDeleteDisposition("rejected", true), "archive");
  assert.equal(getDocumentDeleteDisposition("cancelled", true), "archive");
  assert.equal(canArchiveDocumentStatus("rejected"), true);
  assert.equal(canArchiveDocumentStatus("cancelled"), true);
});

test("active workflow states cannot be deleted or archived", () => {
  for (const status of ["pending_approval", "in_progress", "signing", "pending_signature", "generating_artifact"]) {
    assert.equal(getDocumentDeleteDisposition(status, true), "deny", status);
    assert.equal(canArchiveDocumentStatus(status), false, status);
  }
});

test("completed documents cannot be deleted or archived", () => {
  assert.equal(getDocumentDeleteDisposition("completed", true), "deny");
  assert.equal(canArchiveDocumentStatus("completed"), false);
  assert.equal(canCancelDocumentStatus("completed"), false);
  assert.equal(canCancelDocumentStatus("archived"), false);
});
