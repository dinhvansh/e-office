import { prisma } from '../../config/prisma';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_DAYS = new Set([30, 14, 7, 1]);

function utcDate(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/** Produces idempotent outbox events only; the worker delivers after commit. */
export const documentValidityReminderService = {
  async enqueueDueReminders(now = new Date()): Promise<number> {
    const documents = await prisma.documents.findMany({
      where: { archived_at: null, expiration_date: { not: null }, status: { not: 'archived' } },
      select: {
        id: true, tenant_id: true, title: true, document_number: true, expiration_date: true,
        owner_id: true, department: { select: { manager_id: true } },
      },
    });
    let enqueued = 0;
    for (const document of documents) {
      const remainingDays = Math.floor((utcDate(document.expiration_date!) - utcDate(now)) / DAY_MS);
      const kind = REMINDER_DAYS.has(remainingDays)
        ? 'expiring'
        : remainingDays <= 0 && Math.abs(remainingDays) % 7 === 0
          ? 'expired'
          : null;
      if (!kind) continue;
      const recipientIds = [...new Set([document.owner_id, document.department?.manager_id].filter((id): id is number => Boolean(id)))];
      if (!recipientIds.length) continue;
      const dayKey = now.toISOString().slice(0, 10);
      try {
        await prisma.outbox_events.create({
          data: {
            tenant_id: document.tenant_id,
            aggregate_type: 'document',
            aggregate_id: String(document.id),
            event_type: 'DOCUMENT_VALIDITY_REMINDER',
            payload: { document_id: document.id, title: document.title || document.document_number || `Tài liệu #${document.id}`, expiration_date: document.expiration_date!.toISOString(), kind, remaining_days: remainingDays, recipient_ids: recipientIds },
            deduplication_key: `document-validity:${document.id}:${kind}:${dayKey}`,
          },
        });
        enqueued += 1;
      } catch (error: any) {
        if (error?.code !== 'P2002') throw error;
      }
    }
    return enqueued;
  },
};
