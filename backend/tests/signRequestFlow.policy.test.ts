import assert from "node:assert/strict";
import test from "node:test";
import { buildSignRequestFlowHints, canSendSignRequestStatus, isEditableSignRequestStatus } from "../src/modules/signRequests/signRequestFlow.policy";

test("characterizes editable and sendable sign request statuses", () => {
  assert.equal(isEditableSignRequestStatus("draft"), true);
  assert.equal(isEditableSignRequestStatus("rejected"), true);
  assert.equal(isEditableSignRequestStatus("pending"), false);
  assert.equal(canSendSignRequestStatus("completed"), false);
  assert.equal(canSendSignRequestStatus("cancelled"), false);
  assert.equal(canSendSignRequestStatus("pending"), true);
});

test("characterizes flow hints and signer counters", () => {
  const hints = buildSignRequestFlowHints("pending_approval", [
    { status: "waiting_approval" },
    { status: "pending" },
    { status: "signed" },
  ]);
  assert.equal(hints.flow_state, "AWAITING_APPROVAL");
  assert.equal(hints.next_action, "WAIT_FOR_APPROVAL");
  assert.deepEqual(hints.flow_counters, {
    total_signers: 3,
    pending: 1,
    waiting_approval: 1,
    waiting_signing: 0,
    signed: 1,
  });
});
