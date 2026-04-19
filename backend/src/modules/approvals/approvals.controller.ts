import { Request, Response } from 'express';
import { z } from 'zod';
import { ok } from '../../core/utils/response';
import { approvalsService } from './approvals.service';
import { documentsService } from '../documents/documents.service';

const submitSchema = z.object({
  document_id: z.coerce.number().int().positive(),
  workflow_id: z.coerce.number().int().positive(),
});

const actionSchema = z.object({
  comment: z.string().optional(),
  signature_data: z.string().optional(), // Base64 image
  signature_type: z.enum(['drawn', 'uploaded', 'typed', 'certificate']).optional(),
});

const requestInfoSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
});

const idSchema = z.coerce.number().int().positive();

export class ApprovalsController {
  // List all approvals (for admin/debugging)
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await approvalsService.listApprovals(req.auth!.tenantId);
    res.json(ok(result));
  };

  // Get approval by ID
  getById = async (req: Request, res: Response): Promise<void> => {
    const approvalId = idSchema.parse(req.params.id);
    const result = await approvalsService.getApprovalById(
      approvalId,
      req.auth!.userId,
      req.auth!.tenantId
    );
    res.json(ok(result));
  };

  viewDocument = async (req: Request, res: Response): Promise<void> => {
    const approvalId = idSchema.parse(req.params.id);
    const approval = await approvalsService.getApprovalById(
      approvalId,
      req.auth!.userId,
      req.auth!.tenantId
    );

    const { filePath, fileName, mimeType } = await documentsService.getDocumentFile(
      approval.document.id,
      req.auth!.tenantId,
      req.auth!.userId
    );

    res.setHeader('Content-Type', mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending approval document file:', err);
        if (!res.headersSent) {
          res.status(404).json({ success: false, error: { message: 'File not found' } });
        }
      }
    });
  };

  downloadDocument = async (req: Request, res: Response): Promise<void> => {
    const approvalId = idSchema.parse(req.params.id);
    const approval = await approvalsService.getApprovalById(
      approvalId,
      req.auth!.userId,
      req.auth!.tenantId
    );

    const { filePath, fileName, mimeType } = await documentsService.getDocumentFile(
      approval.document.id,
      req.auth!.tenantId,
      req.auth!.userId
    );

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error downloading approval document file:', err);
        if (!res.headersSent) {
          res.status(404).json({ success: false, error: { message: 'File not found' } });
        }
      }
    });
  };

  // Submit document for approval
  submit = async (req: Request, res: Response): Promise<void> => {
    const body = submitSchema.parse(req.body);
    const result = await approvalsService.submitForApproval(
      body.document_id,
      body.workflow_id,
      req.auth!.tenantId,
      req.auth!.userId
    );
    res.status(201).json(ok(result));
  };

  // Approve
  approve = async (req: Request, res: Response): Promise<void> => {
    const approvalId = idSchema.parse(req.params.id);
    const body = actionSchema.parse(req.body);
    const result = await approvalsService.approve(
      approvalId,
      req.auth!.userId,
      req.auth!.tenantId,
      body.comment,
      body.signature_data,
      body.signature_type
    );
    res.json(ok(result));
  };

  // Reject
  reject = async (req: Request, res: Response): Promise<void> => {
    const approvalId = idSchema.parse(req.params.id);
    const body = actionSchema.parse(req.body);
    const result = await approvalsService.reject(
      approvalId,
      req.auth!.userId,
      req.auth!.tenantId,
      body.comment
    );
    res.json(ok(result));
  };

  // Request more info
  requestInfo = async (req: Request, res: Response): Promise<void> => {
    const approvalId = idSchema.parse(req.params.id);
    const body = requestInfoSchema.parse(req.body);
    const result = await approvalsService.requestMoreInfo(
      approvalId,
      req.auth!.userId,
      req.auth!.tenantId,
      body.comment
    );
    res.json(ok(result));
  };

  // Get my pending approvals with filters, pagination, search, sort
  getMyPending = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string; // pending, approved, rejected, info_requested
    const documentTypeId = req.query.document_type_id ? parseInt(req.query.document_type_id as string) : undefined;
    const creatorSearch = req.query.creator_search as string; // Search by creator name or email
    const sortBy = req.query.sort_by as string || 'created_at'; // created_at, document_number
    const sortOrder = req.query.sort_order as string || 'desc'; // asc, desc

    const result = await approvalsService.getMyPendingApprovals(
      req.auth!.userId,
      req.auth!.tenantId,
      {
        page,
        limit,
        search,
        status,
        documentTypeId,
        creatorSearch,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc'
      }
    );
    res.json(ok(result));
  };

  // Get document approvals (history)
  getDocumentApprovals = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.documentId);
    const approvals = await approvalsService.getDocumentApprovals(
      documentId,
      req.auth!.tenantId
    );
    res.json(ok({ approvals }));
  };

  // Get workflow instance for document
  getWorkflowInstance = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.documentId);
    const instance = await approvalsService.getWorkflowInstance(
      documentId,
      req.auth!.tenantId
    );
    res.json(ok({ instance }));
  };

  // Get my combined tasks (approvals + signing)
  getMyCombinedTasks = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const taskType = req.query.task_type as string; // 'approval' | 'signing' | undefined (all)
    const status = req.query.status as string;
    const documentTypeId = req.query.document_type_id ? parseInt(req.query.document_type_id as string) : undefined;
    const sortBy = req.query.sort_by as string || 'created_at';
    const sortOrder = req.query.sort_order as string || 'desc';

    const result = await approvalsService.getMyCombinedTasks(
      req.auth!.userId,
      req.auth!.tenantId,
      {
        page,
        limit,
        search,
        taskType,
        status,
        documentTypeId,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc'
      }
    );
    res.json(ok(result));
  };
}

export const approvalsController = new ApprovalsController();
