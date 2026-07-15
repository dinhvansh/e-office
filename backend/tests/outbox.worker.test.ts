import assert from "node:assert/strict";
import test from "node:test";
import { dispatchOutboxEvent, processOutboxBatch, retryAt } from "../src/workers/outbox.worker";
import { emailService } from "../src/modules/common/email.service";
import { DeliveryError } from "../src/modules/outbox/deliveryError";
import { outboxDeliveryService } from "../src/modules/outbox/outboxDelivery.service";
import { prisma } from "../src/config/prisma";

test("outbox retry delay grows exponentially and is bounded", () => {
  const now = Date.now();
  const firstRetryDelay = retryAt(1).getTime() - now;
  const cappedRetryDelay = retryAt(100).getTime() - now;

  assert.ok(firstRetryDelay >= 1900 && firstRetryDelay <= 2100);
  assert.ok(cappedRetryDelay >= 3_599_900 && cappedRetryDelay <= 3_600_100);
});

test("email delivery outbox events dispatch the named template", async () => {
  const service = emailService as unknown as { deliver(template: string, data: Record<string, unknown>): Promise<void> };
  const original = service.deliver;
  let received: unknown;
  service.deliver = async (template, data) => { received = { template, data }; };
  try {
    await dispatchOutboxEvent({
      tenant_id: 1,
      event_type: "EMAIL_DELIVERY_REQUESTED",
      payload: { template: "sign_completed", data: { recipientEmail: "recipient@example.test" } },
    });
    assert.deepEqual(received, { template: "sign_completed", data: { recipientEmail: "recipient@example.test" } });
  } finally {
    service.deliver = original;
  }
});

test("invalid email delivery events are permanent failures", async () => {
  await assert.rejects(
    dispatchOutboxEvent({ tenant_id: 1, event_type: "EMAIL_DELIVERY_REQUESTED", payload: {} }),
    (error: unknown) => error instanceof DeliveryError && error.retryable === false,
  );
});

test("repeating an email business action keeps one delivery event and its stable dedupe key", async () => {
  const rows: Array<{ deduplication_key: string; event_type: string }> = [];
  const db = {
    outbox_events: {
      create: async ({ data }: { data: { deduplication_key: string; event_type: string } }) => {
        if (rows.some((row) => row.deduplication_key === data.deduplication_key)) {
          const error = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
          throw error;
        }
        rows.push(data);
      },
    },
  };
  const input = {
    tenantId: 7,
    aggregateType: "document",
    aggregateId: 42,
    template: "sign_completed",
    data: { recipientEmail: "owner@example.test", documentUrl: "https://app.example.test/documents/42" },
    deduplicationKey: "sign-completed-owner:42",
  };

  await outboxDeliveryService.enqueueEmail(db as never, input);
  await assert.rejects(outboxDeliveryService.enqueueEmail(db as never, input), { code: "P2002" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].deduplication_key, "sign-completed-owner:42");
  assert.equal(rows[0].event_type, "EMAIL_DELIVERY_REQUESTED");
});

test("repeating a webhook business event keeps one SIGN_COMPLETED outbox row", async () => {
  const rows: Array<{ deduplication_key: string; event_type: string }> = [];
  const createSignCompletedEvent = async () => {
    const row = { deduplication_key: "sign-completed:19", event_type: "SIGN_COMPLETED" };
    if (rows.some((existing) => existing.deduplication_key === row.deduplication_key)) {
      throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    }
    rows.push(row);
  };

  await createSignCompletedEvent();
  await assert.rejects(createSignCompletedEvent(), { code: "P2002" });
  assert.deepEqual(rows, [{ deduplication_key: "sign-completed:19", event_type: "SIGN_COMPLETED" }]);
});

test("worker releases stale processing locks before claiming new events", async () => {
  const outbox = prisma.outbox_events as unknown as {
    updateMany: (input: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
  };
  const originalUpdateMany = outbox.updateMany;
  const calls: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
  outbox.updateMany = async (input) => {
    calls.push(input);
    return { count: 0 };
  };
  try {
    assert.equal(await processOutboxBatch(0), 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].where.status, "processing");
    assert.deepEqual(calls[0].data, { status: "pending", locked_at: null });
    assert.ok((calls[0].where.locked_at as { lt: Date }).lt instanceof Date);
  } finally {
    outbox.updateMany = originalUpdateMany;
  }
});

test("retryable delivery failure returns the event to pending with an attempt", async () => {
  const outbox = prisma.outbox_events as unknown as {
    updateMany: (...args: unknown[]) => Promise<{ count: number }>;
    findFirst: (...args: unknown[]) => Promise<unknown>;
    update: (input: { data: Record<string, unknown> }) => Promise<unknown>;
    create: (...args: unknown[]) => Promise<unknown>;
  };
  const originals = { updateMany: outbox.updateMany, findFirst: outbox.findFirst, update: outbox.update, create: outbox.create };
  const service = emailService as unknown as { deliver(template: string, data: Record<string, unknown>): Promise<void> };
  const originalDeliver = service.deliver;
  const updates: Record<string, unknown>[] = [];
  let read = false;
  outbox.updateMany = async () => ({ count: read ? 1 : 0 });
  outbox.findFirst = async () => {
    if (read) return null;
    read = true;
    return { id: "event-1", tenant_id: 1, event_type: "EMAIL_DELIVERY_REQUESTED", payload: { template: "sign_completed", data: {} }, attempt_count: 0 };
  };
  outbox.update = async ({ data }) => { updates.push(data); return {}; };
  let created = 0;
  outbox.create = async () => { created += 1; return {}; };
  service.deliver = async () => { throw new DeliveryError("temporary SMTP failure", true); };
  try {
    assert.equal(await processOutboxBatch(1), 0);
    assert.equal(updates.at(-1)?.status, "pending");
    assert.equal(updates.at(-1)?.attempt_count, 1);
    assert.equal(updates.at(-1)?.last_error, "temporary SMTP failure");
    assert.equal(created, 0);
  } finally {
    outbox.updateMany = originals.updateMany; outbox.findFirst = originals.findFirst; outbox.update = originals.update; outbox.create = originals.create; service.deliver = originalDeliver;
  }
});

test("permanent delivery failure is marked failed without retry", async () => {
  const outbox = prisma.outbox_events as unknown as {
    updateMany: (...args: unknown[]) => Promise<{ count: number }>;
    findFirst: (...args: unknown[]) => Promise<unknown>;
    update: (input: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  const originals = { updateMany: outbox.updateMany, findFirst: outbox.findFirst, update: outbox.update };
  const service = emailService as unknown as { deliver(template: string, data: Record<string, unknown>): Promise<void> };
  const originalDeliver = service.deliver;
  const updates: Record<string, unknown>[] = [];
  let read = false;
  outbox.updateMany = async () => ({ count: read ? 1 : 0 });
  outbox.findFirst = async () => { if (read) return null; read = true; return { id: "event-2", tenant_id: 1, event_type: "EMAIL_DELIVERY_REQUESTED", payload: { template: "sign_completed", data: {} }, attempt_count: 0 }; };
  outbox.update = async ({ data }) => { updates.push(data); return {}; };
  service.deliver = async () => { throw new DeliveryError("Webhook destination rejected the delivery", false); };
  try {
    await processOutboxBatch(1);
    assert.equal(updates.at(-1)?.status, "failed");
    assert.equal(updates.at(-1)?.attempt_count, 1);
  } finally {
    outbox.updateMany = originals.updateMany; outbox.findFirst = originals.findFirst; outbox.update = originals.update; service.deliver = originalDeliver;
  }
});
