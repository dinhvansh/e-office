import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export class OutboxDeliveryService {
  async enqueueEmail(
    db: DbClient,
    input: {
      tenantId: number | null;
      aggregateType: string;
      aggregateId: string | number;
      template: string;
      data: Record<string, unknown>;
      deduplicationKey: string;
    },
  ): Promise<void> {
    await db.outbox_events.create({
      data: {
        tenant_id: input.tenantId,
        aggregate_type: input.aggregateType,
        aggregate_id: String(input.aggregateId),
        event_type: "EMAIL_DELIVERY_REQUESTED",
        payload: { template: input.template, data: input.data } as unknown as Prisma.InputJsonValue,
        deduplication_key: input.deduplicationKey,
      },
    });
  }
}

export const outboxDeliveryService = new OutboxDeliveryService();
