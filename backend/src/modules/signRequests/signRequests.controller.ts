import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../../core/utils/response";
import { signRequestsService } from "./signRequests.service";
import { signRequestFieldsService } from "./signRequestFields.service";

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

  getMyRequests = async (req: Request, res: Response): Promise<void> => {
    const status = req.query.status as string | undefined;
    const signRequests = await signRequestsService.getMySignRequests(
      req.auth!.userId,
      req.auth!.tenantId,
      status
    );
    
    // Calculate progress for each request
    const requestsWithProgress = signRequests.map(sr => {
      const totalSigners = sr.signers.length;
      const signedCount = sr.signers.filter(s => s.status === 'signed' || s.status === 'completed').length;
      const rejectedCount = sr.signers.filter(s => s.status === 'rejected').length;
      
      return {
        ...sr,
        progress: {
          total: totalSigners,
          signed: signedCount,
          rejected: rejectedCount,
          pending: totalSigners - signedCount - rejectedCount,
          percentage: totalSigners > 0 ? Math.round((signedCount / totalSigners) * 100) : 0
        }
      };
    });
    
    res.json(ok({ sign_requests: requestsWithProgress }));
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

  // Signers Management

  addSigner = async (req: Request, res: Response): Promise<void> => {
    const signRequestId = idSchema.parse(req.params.id);
    const signerData = signerSchema.extend({
      signing_order: z.number().int().optional(),
    }).parse(req.body);
    
    const signer = await signRequestsService.addSigner(
      signRequestId,
      req.auth!.tenantId,
      signerData
    );
    
    res.status(201).json(ok({ signer }));
  };

  // Field Management Endpoints

  getEditor = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const editorData = await signRequestFieldsService.getEditorData(
      id,
      req.auth!.tenantId,
      req.auth!.userId
    );
    res.json(ok(editorData));
  };

  saveFields = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const fieldsSchema = z.array(
      z.object({
        id: z.number().optional(),
        assigned_signer_id: z.number().nullable().optional(),
        type: z.enum(['signature', 'text', 'date', 'checkbox']),
        page: z.number().int().min(1),
        x: z.number(),
        y: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        required: z.boolean().optional(),
        label: z.string().optional(),
        placeholder: z.string().optional(),
        read_only: z.boolean().optional(),
      })
    );
    const fields = fieldsSchema.parse(req.body.fields);
    await signRequestFieldsService.saveFields(id, fields, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ saved: true }));
  };

  deleteField = async (req: Request, res: Response): Promise<void> => {
    const signRequestId = idSchema.parse(req.params.id);
    const fieldId = idSchema.parse(req.params.fieldId);
    await signRequestFieldsService.deleteField(fieldId, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ deleted: true }));
  };

  send = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const signRequest = await signRequestsService.sendSignRequest(id, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ sign_request: signRequest }));
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const { reason } = req.body;
    const signRequest = await signRequestsService.cancelSignRequest(
      id,
      req.auth!.tenantId,
      req.auth!.userId,
      reason
    );
    res.json(ok({ sign_request: signRequest }));
  };

  // Internal Signing (no OTP required)
  signInternal = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const signatureSchema = z.object({
      signature_data: z.string().min(1),
      signature_type: z.enum(['drawn', 'uploaded', 'typed']),
    });
    const body = signatureSchema.parse(req.body);
    
    const result = await signRequestsService.signInternal(
      id,
      req.auth!.userId,
      req.auth!.tenantId,
      body.signature_data,
      body.signature_type,
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    );
    
    res.json(ok(result));
  };
}
