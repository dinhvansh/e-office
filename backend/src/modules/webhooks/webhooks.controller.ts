import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../../core/utils/response";
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

export class WebhooksController {
  list = async (req: Request, res: Response): Promise<void> => {
    const webhooks = await webhooksRepository.findByTenantId(req.auth!.tenantId);
    res.json(ok(webhooks));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createWebhookSchema.parse(req.body);
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
    const id = parseInt(req.params.id);
    const webhook = await webhooksRepository.findById(id, req.auth!.tenantId);
    
    if (!webhook) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    res.json(ok(webhook));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const body = updateWebhookSchema.parse(req.body);

    const existing = await webhooksRepository.findById(id, req.auth!.tenantId);
    if (!existing) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    const webhook = await webhooksRepository.update(id, req.auth!.tenantId, body);
    res.json(ok(webhook));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    const existing = await webhooksRepository.findById(id, req.auth!.tenantId);
    if (!existing) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    await webhooksRepository.delete(id, req.auth!.tenantId);
    res.json(ok({ deleted: true }));
  };

  getLogs = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 100;

    const webhook = await webhooksRepository.findById(id, req.auth!.tenantId);
    if (!webhook) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    const logs = await webhooksRepository.findLogsByWebhookId(id, limit);
    res.json(ok(logs));
  };
}
