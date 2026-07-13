import { Request, Response } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { ok } from "../../core/utils/response";
import { signersService } from "./signers.service";

const createSchema = z.object({
  sign_request_id: z.coerce.number().int(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().optional(),
});

const signSchema = z.object({
  otp: z.string().min(4),
  signature_data: z.record(z.unknown()).optional(),
});

const idSchema = z.coerce.number().int().positive();

export class SignersController {
  addSigner = async (req: Request, res: Response): Promise<void> => {
    const body = createSchema.parse(req.body);
    await signersService.addSigner(req.auth!.tenantId, req.auth!.userId, {
      sign_request_id: body.sign_request_id!,
      email: body.email!,
      name: body.name!,
      role: body.role,
    });
    res.status(201).json(ok({ created: true }));
  };

  sendOtp = async (req: Request, res: Response): Promise<void> => {
    const signerId = idSchema.parse(req.params.id);
    const otp = await signersService.sendOtp(signerId, req.auth!.tenantId, req.auth!.userId);
    const payload: Record<string, unknown> = { sent: true };
    if (env.NODE_ENV !== "production") {
      payload.debug_otp = otp;
    }
    res.json(ok(payload));
  };

  sign = async (req: Request, res: Response): Promise<void> => {
    const signerId = idSchema.parse(req.params.id);
    const body = signSchema.parse(req.body);
    await signersService.submitSignature(signerId, req.auth!.tenantId, req.auth!.userId, {
      otp: body.otp,
      signature_data: body.signature_data,
    });
    res.json(ok({ signed: true }));
  };
}
