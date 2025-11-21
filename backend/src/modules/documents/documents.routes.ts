import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { DocumentsController } from "./documents.controller";

const controller = new DocumentsController();

export const documentsRouter = Router();

documentsRouter.use(authGuard);
documentsRouter.get("/", asyncHandler(controller.list));
documentsRouter.get("/tags/all", asyncHandler(controller.getAllTags));
documentsRouter.get("/:id/download", asyncHandler(controller.download));
documentsRouter.get("/:id/view", asyncHandler(controller.view));
documentsRouter.get("/:id/tags", asyncHandler(controller.getTags));
documentsRouter.get("/:id", asyncHandler(controller.getById));
documentsRouter.get("/:id/permissions", asyncHandler(controller.getPermissions));
documentsRouter.get("/:id/versions", asyncHandler(controller.getVersions));
documentsRouter.get("/:id/versions/latest", asyncHandler(controller.getLatestVersion));
documentsRouter.post("/", asyncHandler(controller.create));
documentsRouter.post("/:id/tags", asyncHandler(controller.addTag));
documentsRouter.post("/:id/permissions", asyncHandler(controller.grantPermission));
documentsRouter.post("/:id/versions", asyncHandler(controller.createVersion));
documentsRouter.delete("/:id", asyncHandler(controller.delete));
documentsRouter.delete("/:id/tags", asyncHandler(controller.removeTag));
documentsRouter.delete("/:id/permissions", asyncHandler(controller.revokePermission));
