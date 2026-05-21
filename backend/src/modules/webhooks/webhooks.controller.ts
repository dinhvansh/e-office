import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../core/errors/api-error";
import { ok } from "../../core/utils/response";
import { apiTokensService } from "./apiTokens.service";
import { webhooksRepository } from "./webhooks.repository";

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1, "At least one event is required"),
  secret: z.string().optional(),
  active: z.boolean().optional().default(true),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  secret: z.string().optional(),
  active: z.boolean().optional(),
});

const idSchema = z.coerce.number().int().positive();
const limitSchema = z.coerce.number().int().positive().max(500).optional();
const apiTokenIdSchema = z.string().uuid();
const createApiTokenSchema = z.object({
  name: z.string().trim().min(3, "Token name must be at least 3 characters").max(100, "Token name is too long"),
});

const parseOrBadRequest = <T>(result: z.SafeParseReturnType<unknown, T>, message: string): T => {
  if (!result.success) {
    throw ApiError.badRequest(message, "VALIDATION_ERROR", result.error.flatten());
  }
  return result.data;
};

export class WebhooksController {
  listApiTokens = async (req: Request, res: Response): Promise<void> => {
    const tokens = await apiTokensService.listForTenant(req.auth!.tenantId);
    res.json(ok(tokens));
  };

  createApiToken = async (req: Request, res: Response): Promise<void> => {
    const body = parseOrBadRequest(createApiTokenSchema.safeParse(req.body), "Invalid API token payload");
    const token = await apiTokensService.createForTenant(req.auth!.tenantId, req.auth!.userId, body.name);
    res.status(201).json(ok(token));
  };

  revokeApiToken = async (req: Request, res: Response): Promise<void> => {
    const tokenId = parseOrBadRequest(apiTokenIdSchema.safeParse(req.params.tokenId), "Invalid API token id");
    const token = await apiTokensService.revokeForTenant(req.auth!.tenantId, tokenId, req.auth!.userId);

    if (!token) {
      throw ApiError.notFound("API token not found", "API_TOKEN_NOT_FOUND");
    }

    res.json(ok(token));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const webhooks = await webhooksRepository.findByTenantId(req.auth!.tenantId);
    res.json(ok(webhooks));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = parseOrBadRequest(createWebhookSchema.safeParse(req.body), "Invalid webhook payload");
    const webhook = await webhooksRepository.create({
      tenant_id: req.auth!.tenantId,
      url: body.url,
      events: body.events,
      secret: body.secret,
      active: body.active,
    });
    res.status(201).json(ok(webhook));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseOrBadRequest(idSchema.safeParse(req.params.id), "Invalid webhook id");
    const webhook = await webhooksRepository.findById(id, req.auth!.tenantId);
    
    if (!webhook) {
      throw ApiError.notFound("Webhook not found", "WEBHOOK_NOT_FOUND");
    }

    res.json(ok(webhook));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseOrBadRequest(idSchema.safeParse(req.params.id), "Invalid webhook id");
    const body = parseOrBadRequest(updateWebhookSchema.safeParse(req.body), "Invalid webhook payload");

    const existing = await webhooksRepository.findById(id, req.auth!.tenantId);
    if (!existing) {
      throw ApiError.notFound("Webhook not found", "WEBHOOK_NOT_FOUND");
    }

    const webhook = await webhooksRepository.update(id, req.auth!.tenantId, body);
    res.json(ok(webhook));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseOrBadRequest(idSchema.safeParse(req.params.id), "Invalid webhook id");

    const existing = await webhooksRepository.findById(id, req.auth!.tenantId);
    if (!existing) {
      throw ApiError.notFound("Webhook not found", "WEBHOOK_NOT_FOUND");
    }

    await webhooksRepository.delete(id, req.auth!.tenantId);
    res.json(ok({ deleted: true }));
  };

  getLogs = async (req: Request, res: Response): Promise<void> => {
    const id = parseOrBadRequest(idSchema.safeParse(req.params.id), "Invalid webhook id");
    const limit = parseOrBadRequest(limitSchema.safeParse(req.query.limit), "Invalid logs limit") ?? 100;

    const webhook = await webhooksRepository.findById(id, req.auth!.tenantId);
    if (!webhook) {
      throw ApiError.notFound("Webhook not found", "WEBHOOK_NOT_FOUND");
    }

    const logs = await webhooksRepository.findLogsByWebhookId(id, limit);
    res.json(ok(logs));
  };
}
