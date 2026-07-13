import assert from "node:assert/strict";
import test from "node:test";
import { canSignerWriteField } from "../src/modules/signRequests/signRequestFieldAccess.policy";

const signerId = 10;
const signRequestId = 100;

test("allows a signer to write a field assigned to that signer", () => {
  assert.equal(canSignerWriteField(signRequestId, signerId, {
    sign_request_id: signRequestId,
    assigned_signer_id: signerId,
  }), true);
});

test("rejects a guessed field assigned to another signer", () => {
  assert.equal(canSignerWriteField(signRequestId, signerId, {
    sign_request_id: signRequestId,
    assigned_signer_id: 11,
  }), false);
});

test("rejects a guessed field from another sign request", () => {
  assert.equal(canSignerWriteField(signRequestId, signerId, {
    sign_request_id: 101,
    assigned_signer_id: signerId,
  }), false);
});

test("allows a shared field in the signer's sign request", () => {
  assert.equal(canSignerWriteField(signRequestId, signerId, {
    sign_request_id: signRequestId,
    assigned_signer_id: null,
  }), true);
});
