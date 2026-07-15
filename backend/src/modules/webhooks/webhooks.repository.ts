import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../core/errors/api-error";


export interface CreateWebhookDto {
  tenant_id: number;
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
}

export interface UpdateWebhookDto {
  url?: string;
  events?: string[];
  secret?: string;
  active?: boolean;
}

class WebhooksRepository {
  async create(data: CreateWebhookDto) {
    return prisma.webhooks.create({
      data: {
        tenant_id: data.tenant_id,
        url: data.url,
        events: data.events,
        secret: data.secret,
        active: data.active ?? true,
      },
    });
  }

  async findByTenantId(tenantId: number) {
    return prisma.webhooks.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" },
    });
  }

  async findById(id: number, tenantId: number) {
    return prisma.webhooks.findFirst({
      where: { id, tenant_id: tenantId },
    });
  }

  async update(id: number, tenantId: number, data: UpdateWebhookDto) {
    const updated = await prisma.webhooks.updateMany({
      where: { id, tenant_id: tenantId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
    if (updated.count !== 1) {
      throw ApiError.notFound("Webhook not found", "WEBHOOK_NOT_FOUND");
    }
    return prisma.webhooks.findFirstOrThrow({ where: { id, tenant_id: tenantId } });
  }

  async delete(id: number, tenantId: number) {
    const deleted = await prisma.webhooks.deleteMany({ where: { id, tenant_id: tenantId } });
    if (deleted.count !== 1) {
      throw ApiError.notFound("Webhook not found", "WEBHOOK_NOT_FOUND");
    }
  }

  async findActiveByTenantId(tenantId: number) {
    return prisma.webhooks.findMany({
      where: {
        tenant_id: tenantId,
        active: true,
      },
    });
  }

  async createLog(webhookId: number, event: string, payload: unknown, statusCode?: number, response?: string, error?: string) {
    return prisma.webhook_logs.create({
      data: {
        webhook_id: webhookId,
        event,
        payload: payload as Prisma.InputJsonValue,
        status_code: statusCode,
        response,
        error,
      },
    });
  }

  async findLogsByWebhookId(webhookId: number, limit = 100) {
    return prisma.webhook_logs.findMany({
      where: { webhook_id: webhookId },
      orderBy: { sent_at: "desc" },
      take: limit,
    });
  }
}

export const webhooksRepository = new WebhooksRepository();
