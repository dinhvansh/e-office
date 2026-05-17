import { Request, Response } from "express";
import { ApiError } from "../../core/errors/api-error";
import { ok } from "../../core/utils/response";
import { auditService } from "./audit.service";

export class AuditController {
  getDocumentLogs = async (req: Request, res: Response): Promise<void> => {
    const documentId = Number(req.params.documentId);
    if (Number.isNaN(documentId)) {
      throw ApiError.badRequest("Invalid document id", "INVALID_DOCUMENT_ID");
    }
    const tenantId = req.auth!.tenantId;
    const logs = await auditService.listDocumentLogs(documentId, tenantId);
    res.json(ok({ logs }));
  };

  getAuthorizationDecisions = async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.auth!.tenantId;
    const userId = req.query.user_id ? Number(req.query.user_id) : undefined;
    const documentId = req.query.document_id ? Number(req.query.document_id) : undefined;
    const action = (req.query.action as string | undefined)?.trim();
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const logs = await auditService.listAuthorizationDecisions(tenantId, {
      userId: Number.isFinite(userId as number) ? userId : undefined,
      documentId: Number.isFinite(documentId as number) ? documentId : undefined,
      action: action || undefined,
      limit: Number.isFinite(limit as number) ? limit : undefined,
    });
    res.json(ok({ logs }));
  };
}
