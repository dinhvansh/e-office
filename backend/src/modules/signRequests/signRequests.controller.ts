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
    const requestsWithProgress = signRequests.map((sr: any) => {
      const totalSigners = sr.signers?.length || 0;
      const signedCount = sr.signers?.filter((s: any) => s.status === 'signed' || s.status === 'completed').length || 0;
      const rejectedCount = sr.signers?.filter((s: any) => s.status === 'rejected').length || 0;
      
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

  // Signers Management

  addSigner = async (req: Request, res: Response): Promise<void> => {
    const signRequestId = idSchema.parse(req.params.id);
    const signerData = signerSchema.extend({
      signing_order: z.number().int().optional(),
    }).parse(req.body);
    
    // ✅ Check if draft
    const signRequest = await signRequestsService.getSignRequest(signRequestId, req.auth!.tenantId);
    if (signRequest.status !== 'draft') {
      res.status(400).json({
        success: false,
        error: 'Không thể sửa. Tài liệu đã được gửi đi.',
      });
      return;
    }
    
    const signer = await signRequestsService.addSigner(
      signRequestId,
      req.auth!.tenantId,
      signerData
    );
    
    res.status(201).json(ok({ signer }));
  };

  // ✅ Phase 2: Remove Signer
  removeSigner = async (req: Request, res: Response): Promise<void> => {
    const signRequestId = idSchema.parse(req.params.id);
    const signerId = idSchema.parse(req.params.signerId);

    // Check if draft
    const signRequest = await signRequestsService.getSignRequest(signRequestId, req.auth!.tenantId);
    if (signRequest.status !== 'draft') {
      res.status(400).json({
        success: false,
        error: 'Không thể sửa. Tài liệu đã được gửi đi.',
      });
      return;
    }

    // Check minimum signers
    const signers = await signRequestsService.getSigners(signRequestId, req.auth!.tenantId);
    if (signers.length <= 1) {
      res.status(400).json({
        success: false,
        error: 'Phải có ít nhất 1 người ký',
      });
      return;
    }

    // Remove signer and reassign fields
    await signRequestsService.removeSignerFromRequest(
      signRequestId,
      signerId,
      req.auth!.tenantId
    );

    res.json(ok({ removed: true }));
  };

  // ✅ Phase 2: Update Signer
  updateSigner = async (req: Request, res: Response): Promise<void> => {
    const signRequestId = idSchema.parse(req.params.id);
    const signerId = idSchema.parse(req.params.signerId);
    const updates = z.object({
      email: z.string().email().optional(),
      name: z.string().min(1).optional(),
      role: z.string().optional(),
      signing_order: z.number().optional(),
    }).partial().parse(req.body);

    // Check if draft
    const signRequest = await signRequestsService.getSignRequest(signRequestId, req.auth!.tenantId);
    if (signRequest.status !== 'draft') {
      res.status(400).json({
        success: false,
        error: 'Không thể sửa. Tài liệu đã được gửi đi.',
      });
      return;
    }

    // Update signer
    const signer = await signRequestsService.updateSigner(
      signerId,
      updates,
      req.auth!.tenantId
    );

    res.json(ok({ signer }));
  };

  // ✅ Reorder Signers (Drag & Drop)
  reorderSigners = async (req: Request, res: Response): Promise<void> => {
    const signRequestId = idSchema.parse(req.params.id);
    const { signers } = z.object({
      signers: z.array(z.object({
        id: z.number(),
        signing_order: z.number(),
      })),
    }).parse(req.body);

    // Check if draft
    const signRequest = await signRequestsService.getSignRequest(signRequestId, req.auth!.tenantId);
    if (signRequest.status !== 'draft') {
      res.status(400).json({
        success: false,
        error: 'Không thể sắp xếp lại. Tài liệu đã được gửi đi.',
      });
      return;
    }

    // Update signing_order for all signers
    await signRequestsService.reorderSigners(signRequestId, req.auth!.tenantId, signers);

    res.json(ok({ message: 'Đã cập nhật thứ tự ký' }));
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
    
    // ✅ Check if sign request is in draft status
    const signRequest = await signRequestsService.getSignRequest(id, req.auth!.tenantId);
    if (signRequest.status !== 'draft') {
      res.status(400).json({
        success: false,
        error: 'Không thể chỉnh sửa. Tài liệu đã được gửi đi.',
      });
      return;
    }
    
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

  // Delete sign request (draft only)
  delete = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    
    // Check if draft
    const signRequest = await signRequestsService.getSignRequest(id, req.auth!.tenantId);
    if (signRequest.status !== 'draft') {
      res.status(400).json({
        success: false,
        error: 'Chỉ có thể xóa văn bản ở trạng thái nháp',
      });
      return;
    }
    
    await signRequestsService.deleteSignRequest(id, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ deleted: true }));
  };

  // Revoke completed internal document
  revoke = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    
    await signRequestsService.revokeSignRequest(id, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ revoked: true }));
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
