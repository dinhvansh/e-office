import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { requirePermission } from "../../middleware/permission";
import { DocumentsController } from "./documents.controller";

const controller = new DocumentsController();

export const documentsRouter = Router();

// All routes require authentication
documentsRouter.use(authGuard);

// Read operations - require 'documents:read' permission
documentsRouter.get("/", requirePermission('documents', 'read'), asyncHandler(controller.list));
documentsRouter.get("/tags/all", requirePermission('documents', 'read'), asyncHandler(controller.getAllTags));
documentsRouter.get("/:id/download", requirePermission('documents', 'read'), asyncHandler(controller.download));
documentsRouter.get("/:id/view", requirePermission('documents', 'read'), asyncHandler(controller.view));
documentsRouter.get("/:id/tags", requirePermission('documents', 'read'), asyncHandler(controller.getTags));
documentsRouter.get("/:id", requirePermission('documents', 'read'), asyncHandler(controller.getById));
documentsRouter.get("/:id/permissions", requirePermission('documents', 'read'), asyncHandler(controller.getPermissions));
documentsRouter.get("/:id/versions", requirePermission('documents', 'read'), asyncHandler(controller.getVersions));
documentsRouter.get("/:id/versions/latest", requirePermission('documents', 'read'), asyncHandler(controller.getLatestVersion));

// Create operations - require 'documents:create' permission
documentsRouter.post("/", requirePermission('documents', 'create'), asyncHandler(controller.create));

// Update operations - require 'documents:update' permission
documentsRouter.post("/:id/tags", requirePermission('documents', 'update'), asyncHandler(controller.addTag));
documentsRouter.post("/:id/permissions", requirePermission('documents', 'update'), asyncHandler(controller.grantPermission));
documentsRouter.post("/:id/versions", requirePermission('documents', 'update'), asyncHandler(controller.createVersion));
documentsRouter.post("/:id/submit-for-approval", requirePermission('documents', 'update'), asyncHandler(controller.submitForApproval));
documentsRouter.delete("/:id/tags", requirePermission('documents', 'update'), asyncHandler(controller.removeTag));
documentsRouter.delete("/:id/permissions", requirePermission('documents', 'update'), asyncHandler(controller.revokePermission));

// Delete operations - require 'documents:delete' permission
documentsRouter.delete("/:id", requirePermission('documents', 'delete'), asyncHandler(controller.delete));
