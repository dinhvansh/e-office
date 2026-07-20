import assert from "node:assert/strict";
import test from "node:test";
import { buildSignRequestProgress } from "../src/modules/signRequests/signRequestProgress.policy";

test("approval-only request reports completed approval progress", () => {
  assert.deepEqual(
    buildSignRequestProgress([], [{ action: "approved" }, { action: "approved" }, { action: "approved" }]),
    { total: 3, signed: 3, rejected: 0, pending: 0, percentage: 100, kind: "approval" },
  );
});

test("signing progress takes precedence when the request has signers", () => {
  assert.deepEqual(
    buildSignRequestProgress([{ status: "signed" }, { status: "pending" }], [{ action: "approved" }]),
    { total: 2, signed: 1, rejected: 0, pending: 1, percentage: 50, kind: "signing" },
  );
});

test("approval progress accounts for rejected and pending outcomes", () => {
  assert.deepEqual(
    buildSignRequestProgress([], [{ action: "approved" }, { action: "rejected" }, { action: null }]),
    { total: 3, signed: 1, rejected: 1, pending: 1, percentage: 33, kind: "approval" },
  );
});
