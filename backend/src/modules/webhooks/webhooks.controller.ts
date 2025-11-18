import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../../core/utils/response";
import { webhookService } from "./webhooks.service";

const registerSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).optional().default([]),
  secret: z.string().optional(),
});

export class WebhooksController {
  register = async (req: Request, res: Response): Promise<void> => {
    const body = registerSchema.parse(req.body);
    webhookService.register(req.auth!.tenantId, {
      url: body.url,
      events: body.events,
      secret: body.secret,
    });
    res.status(201).json(ok({ registered: true }));
  };
}
