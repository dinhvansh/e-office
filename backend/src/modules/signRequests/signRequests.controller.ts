import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../../core/utils/response";
import { signRequestsService } from "./signRequests.service";

const signerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().optional(),
  position_data: z.record(z.any()).optional(),
});

const createSchema = z.object({
  document_id: z.coerce.number().int(),
  title: z.string().optional(),
  message: z.string().optional(),
  workflow_type: z.string().optional(),
  deadline: z.string().datetime().optional(),
  signers: z.array(signerSchema).min(1),
});

const idSchema = z.coerce.number().int().positive();

export class SignRequestsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const signRequests = await signRequestsService.listSignRequests(req.auth!.tenantId);
    res.json(ok({ sign_requests: signRequests }));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createSchema.parse(req.body);
    const signRequest = await signRequestsService.createSignRequest(req.auth!.tenantId, req.auth!.userId, {
      document_id: body.document_id,
      title: body.title,
      message: body.message,
      workflow_type: body.workflow_type,
      deadline: body.deadline ? new Date(body.deadline) : null,
      signers: body.signers,
    });
    res.status(201).json(ok({ sign_request: signRequest }));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const signRequest = await signRequestsService.getSignRequest(id, req.auth!.tenantId);
    res.json(ok({ sign_request: signRequest }));
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    await signRequestsService.cancelSignRequest(id, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ cancelled: true }));
  };
}
