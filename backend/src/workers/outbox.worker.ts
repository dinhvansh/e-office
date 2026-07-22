import { prisma } from "../config/prisma";
import { signedArtifactWorker } from "../modules/signRequests/signedArtifact.worker";
import { webhookService } from "../modules/webhooks/webhooks.service";
import { emailService } from "../modules/common/email.service";
import { DeliveryError } from "../modules/outbox/deliveryError";
import { documentValidityReminderService } from "../modules/documents/documentValidityReminder.service";
import { notificationsService } from "../modules/notifications/notifications.service";
import { NotificationType } from "../modules/notifications/notifications.types";

const MAX_ATTEMPTS = 5;
const STALE_LOCK_MS = 5 * 60 * 1000;

export function retryAt(attemptCount: number): Date {
  const delaySeconds = Math.min(3600, 2 ** Math.min(attemptCount, 12));
  return new Date(Date.now() + delaySeconds * 1000);
}

export async function dispatchOutboxEvent(event: { tenant_id: number | null; event_type: string; payload: unknown }): Promise<void> {
  if (event.event_type === 'DOCUMENT_VALIDITY_REMINDER') {
    if (event.tenant_id === null) throw new Error('DOCUMENT_VALIDITY_REMINDER requires a tenant');
    const payload = event.payload as { document_id: number; title: string; kind: 'expiring' | 'expired'; remaining_days: number; recipient_ids: number[] };
    const title = payload.kind === 'expired' ? 'Tài liệu đã hết hiệu lực' : 'Tài liệu sắp hết hiệu lực';
    const message = payload.kind === 'expired'
      ? `“${payload.title}” đã hết hiệu lực. Hãy tạo phiên bản mới hoặc gia hạn.`
      : `“${payload.title}” sẽ hết hiệu lực sau ${payload.remaining_days} ngày.`;
    await Promise.all(payload.recipient_ids.map((userId) => notificationsService.createNotification({ tenantId: event.tenant_id!, userId, type: payload.kind === 'expired' ? NotificationType.DOCUMENT_EXPIRED : NotificationType.DOCUMENT_EXPIRING, title, message, link: `/documents/${payload.document_id}` })));
    return;
  }
  if (event.event_type === "SIGNED_ARTIFACT_REQUESTED") {
    await signedArtifactWorker.processSignedArtifactEvent(event);
    return;
  }

  if (event.event_type === "EMAIL_DELIVERY_REQUESTED") {
    const payload = event.payload as { template?: string; data?: Record<string, unknown> };
    if (!payload.template || !payload.data) throw new DeliveryError("Invalid email delivery event", false);
    await emailService.deliver(payload.template, payload.data);
    return;
  }

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

  if (event.event_type === "SIGN_COMPLETED") {
    if (event.tenant_id === null) throw new Error("SIGN_COMPLETED requires a tenant");
    await webhookService.emit(event.tenant_id, "sign.completed", event.payload);
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
  // A process can die after claiming an event. Release only old claims so a
  // live worker is never stolen by another worker.
  await prisma.outbox_events.updateMany({
    where: { status: "processing", locked_at: { lt: new Date(Date.now() - STALE_LOCK_MS) } },
    data: { status: "pending", locked_at: null },
  });

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
      await dispatchOutboxEvent(event);
      await prisma.outbox_events.update({
        where: { id: event.id },
        data: { status: "processed", processed_at: new Date(), last_error: null },
      });
      processed += 1;
    } catch (error) {
      const attemptCount = event.attempt_count + 1;
      const permanent = error instanceof DeliveryError && !error.retryable;
      await prisma.outbox_events.update({
        where: { id: event.id },
        data: {
          status: permanent || attemptCount >= MAX_ATTEMPTS ? "failed" : "pending",
          attempt_count: attemptCount,
          available_at: retryAt(attemptCount),
          locked_at: null,
          last_error: error instanceof DeliveryError
            ? error.message
            : event.event_type === "SIGNED_ARTIFACT_REQUESTED"
              ? "Signed artifact generation failed"
              : "Outbox dispatch failed",
        },
      });
    }
  }
  return processed;
}

export async function runOutboxWorker(): Promise<void> {
  const pollInterval = Math.max(250, Number(process.env.OUTBOX_POLL_INTERVAL_MS || 2000));
  let stopping = false;
  let nextValidityScanAt = 0;
  const stop = () => { stopping = true; };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);

  while (!stopping) {
    if (Date.now() >= nextValidityScanAt) {
      await documentValidityReminderService.enqueueDueReminders();
      nextValidityScanAt = Date.now() + 6 * 60 * 60 * 1000;
    }
    const processed = await processOutboxBatch();
    if (processed === 0) await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

if (require.main === module) {
  runOutboxWorker()
    .catch((error) => {
      console.error("Outbox worker stopped unexpectedly", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
