import assert from "node:assert/strict";
import test from "node:test";
import { canSignerActInOrder, findNextWaitingSigningOrder } from "../src/modules/signRequests/signingOrder.policy";

test("blocks an order-two signer until every order-one signer completes", () => {
  assert.equal(canSignerActInOrder("sequential", 2, [
    { signing_order: 1, status: "signed" },
    { signing_order: 1, status: "pending" },
    { signing_order: 2, status: "pending" },
  ]), false);
});

test("allows same-order signers to act in parallel", () => {
  assert.equal(canSignerActInOrder("sequential", 1, [
    { signing_order: 1, status: "pending" },
    { signing_order: 1, status: "pending" },
  ]), true);
});

test("allows the next order after all prior signers complete", () => {
  assert.equal(canSignerActInOrder("sequential", 2, [
    { signing_order: 1, status: "signed" },
    { signing_order: 1, status: "completed" },
    { signing_order: 2, status: "pending" },
  ]), true);
});

test("activates the lowest waiting sequential order even when orders are not contiguous", () => {
  assert.equal(findNextWaitingSigningOrder([
    { signing_order: 4, status: "waiting_signing" },
    { signing_order: 2, status: "waiting_signing" },
    { signing_order: 1, status: "signed" },
  ]), 2);
  assert.equal(findNextWaitingSigningOrder([{ signing_order: 1, status: "signed" }]), null);
});
