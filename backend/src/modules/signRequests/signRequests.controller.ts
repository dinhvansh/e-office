import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../../core/utils/response";
import { signRequestsService } from "./signRequests.service";
import { toDocumentAttachmentDTO } from "../documents/documents.dto";
import { signRequestFieldsService } from "./signRequestFields.service";

const signerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().optional(),
  position_data: z.record(z.unknown()).optional(),
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
const rejectInternalSchema = z.object({
  comment: z.string().trim().min(1, "Comment is required"),
});
const draftConfigSchema = z.object({
  signers: z.array(
    z.object({
      id: z.number().int().positive().optional().nullable(),
      email: z.string().email(),
      name: z.string().min(1),
      role: z.string().optional(),
      external_org_id: z.number().int().positive().optional().nullable(),
    })
  ),
  workflow_steps: z
    .array(
      z.object({
        step_name: z.string().min(1),
        approver_type: z.string().optional(),
        approver_id: z.number().int().positive().nullable().optional(),
        participant_role: z.enum(['approver', 'signer']).optional(),
        due_in_days: z.number().int().min(1).max(365).optional(),
        order: z.number().int().min(1).optional(),
      })
    )
    .nullable()
    .optional(),
});

export class SignRequestsController {
  private isEditableStatus(status?: string | null) {
    return status === 'draft' || status === 'rejected';
  }

  list = async (req: Request, res: Response): Promise<void> => {
    const signRequests = await signRequestsService.listSignRequests(req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ sign_requests: signRequests }));
  };

  getMyRequests = async (req: Request, res: Response): Promise<void> => {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await signRequestsService.getMySignRequests(
      req.auth!.userId,
      req.auth!.tenantId,
      status,
      page,
      limit
    );
    
    // Calculate progress for each request
    const requestsWithProgress = result.data.map((sr) => {
      const requestWithSigners = sr as typeof sr & {
        signers?: Array<{ status: string | null }>;
      };
      const totalSigners = requestWithSigners.signers?.length || 0;
      const signedCount = requestWithSigners.signers?.filter((signer) => signer.status === 'signed' || signer.status === 'completed').length || 0;
      const rejectedCount = requestWithSigners.signers?.filter((signer) => signer.status === 'rejected').length || 0;
      
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
    
    res.json(ok({ 
      sign_requests: requestsWithProgress,
      pagination: result.pagination
    }));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createSchema.parse(req.body);
    const signRequest = await signRequestsService.createSignRequest(req.auth!.tenantId, req.auth!.userId, {
      document_id: body.document_id,
      title: body.title,
      message: body.message,
      workflow_type: body.workflow_type,
      deadline: body.deadline ? new Date(body.deadline) : null,
      signers: body.signers.map((signer) => ({
        email: signer.email!,
        name: signer.name!,
        role: signer.role,
        position_data: signer.position_data,
      })),
    });
    res.status(201).json(ok({ sign_request: signRequest }));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const signRequest = await signRequestsService.getSignRequest(id, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ sign_request: signRequest }));
  };

  listComments = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const comments = await signRequestsService.listComments(id, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ comments: comments.map((comment: any) => ({ ...comment, attachments: (comment.attachments || []).map((attachment: any) => ({ ...toDocumentAttachmentDTO(attachment), can_withdraw: attachment.can_withdraw })) })) }));
  };

  addComment = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const body = z.object({ body: z.string().min(1).max(2000), attachments: z.array(z.object({ file_name: z.string().min(1), file_base64: z.string().min(1), file_type: z.string().optional() })).max(5).optional() }).parse(req.body);
    const comment = await signRequestsService.addComment(id, req.auth!.tenantId, req.auth!.userId, body.body, body.attachments as Array<{ file_name: string; file_base64: string; file_type?: string }> | undefined);
    res.status(201).json(ok({ comment: { ...comment, attachments: (comment.attachments || []).map(toDocumentAttachmentDTO) } }));
  };

  editComment = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id); const commentId = idSchema.parse(req.params.commentId);
    const body = z.object({ body: z.string().min(1).max(2000) }).parse(req.body);
    const comment = await signRequestsService.editComment(id, commentId, req.auth!.tenantId, req.auth!.userId, body.body);
    res.json(ok({ comment: { ...comment, attachments: (comment.attachments || []).map(toDocumentAttachmentDTO) } }));
  };
  deleteComment = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id); const commentId = idSchema.parse(req.params.commentId);
    const comment = await signRequestsService.deleteComment(id, commentId, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ comment: { ...comment, attachments: (comment.attachments || []).map(toDocumentAttachmentDTO) } }));
  };

  // Signers Management

  addSigner = async (req: Request, res: Response): Promise<void> => {
    const signRequestId = idSchema.parse(req.params.id);
    const signerData = signerSchema.extend({
      signing_order: z.number().int().optional(),
    }).parse(req.body);
    
    // ✅ Check if draft
    const signRequest = await signRequestsService.getSignRequest(signRequestId, req.auth!.tenantId, req.auth!.userId);
    if (!this.isEditableStatus(signRequest.status)) {
      res.status(400).json({
        success: false,
        error: 'Không thể sửa. Tài liệu đã được gửi đi.',
      });
      return;
    }
    
    const signer = await signRequestsService.addSigner(
      signRequestId,
      req.auth!.tenantId,
      req.auth!.userId,
      {
        email: signerData.email!,
        name: signerData.name!,
        role: signerData.role,
        position_data: signerData.position_data,
        signing_order: signerData.signing_order,
      }
    );
    
    res.status(201).json(ok({ signer }));
  };

  // ✅ Phase 2: Remove Signer
  removeSigner = async (req: Request, res: Response): Promise<void> => {
    const signRequestId = idSchema.parse(req.params.id);
    const signerId = idSchema.parse(req.params.signerId);

    // Check if draft
    const signRequest = await signRequestsService.getSignRequest(signRequestId, req.auth!.tenantId, req.auth!.userId);
    if (!this.isEditableStatus(signRequest.status)) {
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
      req.auth!.tenantId,
      req.auth!.userId
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
    const signRequest = await signRequestsService.getSignRequest(signRequestId, req.auth!.tenantId, req.auth!.userId);
    if (!this.isEditableStatus(signRequest.status)) {
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
      req.auth!.tenantId,
      req.auth!.userId
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
    const signRequest = await signRequestsService.getSignRequest(signRequestId, req.auth!.tenantId, req.auth!.userId);
    if (!this.isEditableStatus(signRequest.status)) {
      res.status(400).json({
        success: false,
        error: 'Không thể sắp xếp lại. Tài liệu đã được gửi đi.',
      });
      return;
    }

    // Update signing_order for all signers
    await signRequestsService.reorderSigners(
      signRequestId,
      req.auth!.tenantId,
      req.auth!.userId,
      signers.map((signer) => ({ id: signer.id!, signing_order: signer.signing_order! }))
    );

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
    const signRequest = await signRequestsService.getSignRequest(id, req.auth!.tenantId, req.auth!.userId);
    if (!this.isEditableStatus(signRequest.status)) {
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
        pageIndex: z.number().int().min(0),
        xPct: z.number().min(0).max(1),
        yPct: z.number().min(0).max(1),
        widthPct: z.number().min(0).max(1).optional(),
        heightPct: z.number().min(0).max(1).optional(),
        required: z.boolean().optional(),
        label: z.string().nullable().optional(),
        placeholder: z.string().nullable().optional(),
        read_only: z.boolean().optional(),
      })
    );
    const fields = fieldsSchema.parse(req.body.fields);
    await signRequestFieldsService.saveFields(
      id,
      fields.map((field) => ({
        id: field.id,
        assigned_signer_id: field.assigned_signer_id,
        type: field.type!,
        pageIndex: field.pageIndex!,
        xPct: field.xPct!,
        yPct: field.yPct!,
        widthPct: field.widthPct,
        heightPct: field.heightPct,
        required: field.required,
        label: field.label ?? undefined,
        placeholder: field.placeholder ?? undefined,
        read_only: field.read_only,
      })),
      req.auth!.tenantId,
      req.auth!.userId,
    );
    res.json(ok({ saved: true }));
  };

  deleteField = async (req: Request, res: Response): Promise<void> => {
    const fieldId = idSchema.parse(req.params.fieldId);
    await signRequestFieldsService.deleteField(fieldId, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ deleted: true }));
  };

  send = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const signRequest = await signRequestsService.sendSignRequest(id, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ sign_request: signRequest }));
  };

  remind = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const result = await signRequestsService.remindPendingParticipants(
      id,
      req.auth!.tenantId,
      req.auth!.userId
    );
    res.json(ok(result));
  };

  updateDraftConfig = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const body = draftConfigSchema.parse(req.body);
    const signRequest = await signRequestsService.updateDraftConfig(
      id,
      req.auth!.tenantId,
      req.auth!.userId,
      body as {
        signers: Array<{
          id?: number | null;
          email: string;
          name: string;
          role?: string;
          external_org_id?: number | null;
        }>;
        workflow_steps?: Array<{
          step_name: string;
          approver_type?: string;
          approver_id?: number | null;
          participant_role?: 'approver' | 'signer';
          due_in_days?: number;
          order?: number;
        }> | null;
      }
    );
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

  retryArtifact = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const result = await signRequestsService.retrySignedArtifactGeneration(id, req.auth!.tenantId, req.auth!.userId);
    res.json(ok(result));
  };

  // Delete sign request (draft only)
  delete = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    
    // Check if draft
    const signRequest = await signRequestsService.getSignRequest(id, req.auth!.tenantId, req.auth!.userId);
    if (!this.isEditableStatus(signRequest.status)) {
      res.status(400).json({
        success: false,
        error: 'Chỉ có thể xóa văn bản ở trạng thái nháp',
      });
      return;
    }
    
    await signRequestsService.deleteSignRequest(id, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ deleted: true }));
  };

  // Internal Signing (no OTP required)
  signInternal = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    
    // Support both old format (signature_data) and new format (field_signatures)
    const signatureSchema = z.object({
      signature_data: z.string().min(1).optional(),
      field_signatures: z.record(z.string()).optional(),
      signature_type: z.enum(['drawn', 'uploaded', 'typed']),
    }).refine(data => data.signature_data || data.field_signatures, {
      message: "Either signature_data or field_signatures must be provided"
    });
    
    const body = signatureSchema.parse(req.body);
    
    const result = await signRequestsService.signInternal(
      id,
      req.auth!.userId,
      req.auth!.tenantId,
      body.signature_data || body.field_signatures!,
      body.signature_type,
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    );
    
    res.json(ok(result));
  };

  rejectInternal = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const body = rejectInternalSchema.parse(req.body);

    const result = await signRequestsService.rejectInternal(
      id,
      req.auth!.userId,
      req.auth!.tenantId,
      body.comment,
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    );

    res.json(ok(result));
  };
}
