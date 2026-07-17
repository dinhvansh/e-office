import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { authorizationService } from "../modules/authorization/authorization.service";
import { rolesService } from "../modules/roles/roles.service";

const MANAGER_MIN_POSITION_LEVEL = 80;

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

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    if (await rolesService.checkPermission(userId, "audit_logs", "read")) {
      return next();
    }

    const [document, user] = await Promise.all([
      prisma.documents.findFirst({ where: { id: documentId, tenant_id: tenantId }, select: { owner_id: true } }),
      prisma.users.findFirst({
        where: { id: userId, tenant_id: tenantId },
        select: { position: { select: { level: true } } },
      }),
    ]);

    if (!document || !user) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }
    if (document.owner_id === userId) {
      return next();
    }

    const isManagerOrHigher = (user.position?.level ?? 0) >= MANAGER_MIN_POSITION_LEVEL;
    if (!isManagerOrHigher) {
      return res.status(403).json({ success: false, error: "Document audit access denied", code: "DOCUMENT_AUDIT_ACCESS_DENIED" });
    }

    const canReadDocument = await authorizationService.canAccessDocument(userId, tenantId, documentId, "read");
    if (!canReadDocument.allowed) {
      return res.status(403).json({ success: false, error: "Document audit access denied", code: "DOCUMENT_AUDIT_ACCESS_DENIED" });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
