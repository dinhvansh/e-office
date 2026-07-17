import { NextFunction, Request, Response } from "express";
import { canAccessDocumentAudit } from "../modules/audit/document-audit-access.service";

/**
 * Audit data is more sensitive than document content:
 * - users with audit_logs:read may inspect the tenant's audit trail;
 * - a document owner may inspect their own document;
 * - department-head level and above may inspect a document only when they can read it.
 * A user who was merely granted document viewing access is intentionally excluded.
 */
export const requireDocumentAuditAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = Number(req.params.documentId);
    if (!Number.isFinite(documentId) || documentId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid document id" });
    }

    if (!await canAccessDocumentAudit(req.auth!.userId, req.auth!.tenantId, documentId)) {
      return res.status(403).json({ success: false, error: "Document audit access denied", code: "DOCUMENT_AUDIT_ACCESS_DENIED" });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
