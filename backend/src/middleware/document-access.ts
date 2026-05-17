import { NextFunction, Request, Response } from "express";
import { authorizationService, DocumentAction } from "../modules/authorization/authorization.service";

export const requireDocumentAccess = (action: DocumentAction, paramName = "id") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = req.params[paramName];
      const documentId = Number(raw);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        return res.status(400).json({ success: false, error: "Invalid document id" });
      }

      const decision = await authorizationService.canAccessDocumentWithAudit(
        req.auth!.userId,
        req.auth!.tenantId,
        documentId,
        action
      );
      if (!decision.allowed) {
        return res.status(403).json({
          success: false,
          error: "Document access denied",
          code: "DOCUMENT_ACCESS_DENIED",
          reasons: decision.reasons,
          denied_by: decision.deniedBy,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

