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
}
