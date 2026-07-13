import assert from "node:assert/strict";
import test from "node:test";
import { retryAt } from "../src/workers/outbox.worker";

test("outbox retry delay grows exponentially and is bounded", () => {
  const now = Date.now();
  const firstRetryDelay = retryAt(1).getTime() - now;
  const cappedRetryDelay = retryAt(100).getTime() - now;

  assert.ok(firstRetryDelay >= 1900 && firstRetryDelay <= 2100);
  assert.ok(cappedRetryDelay >= 3_599_900 && cappedRetryDelay <= 3_600_100);
});
