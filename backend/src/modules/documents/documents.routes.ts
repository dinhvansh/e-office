import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { requirePermission } from "../../middleware/permission";
import { requireDocumentAccess } from "../../middleware/document-access";
import { DocumentsController } from "./documents.controller";

const controller = new DocumentsController();

export const documentsRouter = Router();

// All routes require authentication
documentsRouter.use(authGuard);

// Read operations - require 'documents:read' permission
documentsRouter.get("/", requirePermission('documents', 'read'), asyncHandler(controller.list));
documentsRouter.get("/tags/all", requirePermission('documents', 'read'), asyncHandler(controller.getAllTags));
documentsRouter.get("/revision-sources", requirePermission('documents', 'read'), asyncHandler(controller.listRevisionSources));
documentsRouter.get("/:id/download", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.download));
documentsRouter.get("/:id/download-signed", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.downloadSigned));
documentsRouter.get("/:id/dossier/download", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.downloadDossier));
documentsRouter.get("/:id/view", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.view));
documentsRouter.get("/:id/view-signed", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.viewSigned));
documentsRouter.get("/:id/attachments", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.listAttachments));
documentsRouter.get("/:id/attachments/:attachmentId/download", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.downloadAttachment));
documentsRouter.get("/:id/tags", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.getTags));
documentsRouter.get("/:id", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.getById));
documentsRouter.get("/:id/permissions", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.getPermissions));
documentsRouter.get("/:id/permissions/effective", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.getEffectivePermissions));
documentsRouter.get("/:id/access-viewers", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.getEffectiveViewers));
documentsRouter.get("/:id/versions", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.getVersions));
documentsRouter.get("/:id/versions/latest", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.getLatestVersion));
documentsRouter.get("/:id/revision-history", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.getRevisionHistory));

// Create operations - require 'documents:create' permission
documentsRouter.post("/", requirePermission('documents', 'create'), asyncHandler(controller.create));

// Update operations - require 'documents:update' permission
documentsRouter.post("/:id/tags", requirePermission('documents', 'update'), requireDocumentAccess("edit"), asyncHandler(controller.addTag));
documentsRouter.post("/:id/attachments", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.addAttachment));
documentsRouter.post("/:id/attachments/:attachmentId/withdraw", requirePermission('documents', 'read'), requireDocumentAccess("read"), asyncHandler(controller.withdrawAttachment));
documentsRouter.put("/:id/cc-emails", requirePermission('documents', 'update'), requireDocumentAccess("edit"), asyncHandler(controller.syncCCEmails));
documentsRouter.post("/:id/permissions", requirePermission('documents', 'update'), requireDocumentAccess("share"), asyncHandler(controller.grantPermission));
documentsRouter.post("/:id/versions", requirePermission('documents', 'update'), requireDocumentAccess("edit"), asyncHandler(controller.createVersion));
documentsRouter.post("/:id/submit-for-approval", requirePermission('documents', 'update'), requireDocumentAccess("approve"), asyncHandler(controller.submitForApproval));
documentsRouter.post("/:id/archive", requirePermission('documents', 'update'), requireDocumentAccess("edit"), asyncHandler(controller.archiveDocument));
documentsRouter.post("/:id/cancel", requirePermission('documents', 'update'), requireDocumentAccess("edit"), asyncHandler(controller.cancelDocument));
documentsRouter.delete("/:id/tags", requirePermission('documents', 'update'), requireDocumentAccess("edit"), asyncHandler(controller.removeTag));
documentsRouter.delete("/:id/permissions", requirePermission('documents', 'update'), requireDocumentAccess("share"), asyncHandler(controller.revokePermission));

// Delete operations - require 'documents:delete' permission
documentsRouter.delete("/:id", requirePermission('documents', 'delete'), requireDocumentAccess("delete"), asyncHandler(controller.delete));
