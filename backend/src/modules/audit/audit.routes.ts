import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requirePermission } from "../../middleware/permission";
import { authGuard } from "../auth/auth.middleware";
import { AuditController } from "./audit.controller";
import { requireDocumentAuditAccess } from "../../middleware/document-audit-access";

const controller = new AuditController();

export const auditRouter = Router();

auditRouter.use(authGuard);
auditRouter.get("/authz/decisions", requirePermission("audit_logs", "read"), asyncHandler(controller.getAuthorizationDecisions));
auditRouter.get("/:documentId", requireDocumentAuditAccess, asyncHandler(controller.getDocumentLogs));
