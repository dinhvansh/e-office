import { prisma } from "../config/prisma";
import { webhookService } from "../modules/webhooks/webhooks.service";

const MAX_ATTEMPTS = 10;

export function retryAt(attemptCount: number): Date {
  const delaySeconds = Math.min(3600, 2 ** Math.min(attemptCount, 12));
  return new Date(Date.now() + delaySeconds * 1000);
}

async function dispatch(event: { tenant_id: number | null; event_type: string; payload: unknown }): Promise<void> {
  if (event.event_type === "SIGN_REQUEST_CREATED") {
    if (event.tenant_id === null) throw new Error("SIGN_REQUEST_CREATED requires a tenant");
    await webhookService.emit(event.tenant_id, "sign.started", event.payload);
    return;
  }

  if (event.event_type === "DOCUMENT_REJECTED") {
    if (event.tenant_id === null) throw new Error("DOCUMENT_REJECTED requires a tenant");
    await webhookService.emit(event.tenant_id, "document.rejected", event.payload);
    return;
  }

  if (event.event_type === "SIGNATURE_SUBMITTED") {
    if (event.tenant_id === null) throw new Error("SIGNATURE_SUBMITTED requires a tenant");
    await webhookService.emit(event.tenant_id, "sign.signature_submitted", event.payload);
    return;
  }

  if (event.event_type === "SIGNER_ACTIVATED") {
    if (event.tenant_id === null) throw new Error("SIGNER_ACTIVATED requires a tenant");
    await webhookService.emit(event.tenant_id, "signer.activated", event.payload);
    return;
  }

  if (event.event_type === "APPROVAL_STEP_ACTIVATED") {
    if (event.tenant_id === null) throw new Error("APPROVAL_STEP_ACTIVATED requires a tenant");
    await webhookService.emit(event.tenant_id, "workflow.step_activated", event.payload);
    return;
  }

  if (event.event_type === "APPROVAL_WORKFLOW_COMPLETED") {
    if (event.tenant_id === null) throw new Error("APPROVAL_WORKFLOW_COMPLETED requires a tenant");
    await webhookService.emit(event.tenant_id, "workflow.completed", event.payload);
    return;
  }

  throw new Error(`Unsupported outbox event type: ${event.event_type}`);
}

export async function processOutboxBatch(limit = 20): Promise<number> {
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const event = await prisma.outbox_events.findFirst({
      where: { status: "pending", available_at: { lte: new Date() } },
      orderBy: { created_at: "asc" },
    });
    if (!event) break;

    const claim = await prisma.outbox_events.updateMany({
      where: { id: event.id, status: "pending" },
      data: { status: "processing", locked_at: new Date() },
    });
    if (claim.count !== 1) continue;

    try {
      await dispatch(event);
      await prisma.outbox_events.update({
        where: { id: event.id },
        data: { status: "processed", processed_at: new Date(), last_error: null },
      });
      processed += 1;
    } catch (error) {
      const attemptCount = event.attempt_count + 1;
      await prisma.outbox_events.update({
        where: { id: event.id },
        data: {
          status: attemptCount >= MAX_ATTEMPTS ? "failed" : "pending",
          attempt_count: attemptCount,
          available_at: retryAt(attemptCount),
          locked_at: null,
          last_error: error instanceof Error ? error.message : "Unknown outbox dispatch error",
        },
      });
    }
  }
  return processed;
}

if (require.main === module) {
  processOutboxBatch()
    .then((processed) => console.log(`Processed ${processed} outbox event(s)`))
    .finally(() => prisma.$disconnect());
}
