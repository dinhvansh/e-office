import { Request, Response } from 'express';
import { z } from 'zod';
import { ok } from '../../core/utils/response';
import { approvalsService } from './approvals.service';

const submitSchema = z.object({
  document_id: z.coerce.number().int().positive(),
  workflow_id: z.coerce.number().int().positive(),
});

const actionSchema = z.object({
  comment: z.string().optional(),
});

const requestInfoSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
});

const idSchema = z.coerce.number().int().positive();

export class ApprovalsController {
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
      body.comment
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

  // Get my pending approvals
  getMyPending = async (req: Request, res: Response): Promise<void> => {
    const approvals = await approvalsService.getMyPendingApprovals(
      req.auth!.userId,
      req.auth!.tenantId
    );
    res.json(ok({ approvals }));
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
}

export const approvalsController = new ApprovalsController();
