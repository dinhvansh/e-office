import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { AuditController } from "./audit.controller";

const controller = new AuditController();

export const auditRouter = Router();

auditRouter.get("/:documentId", authGuard, asyncHandler(controller.getDocumentLogs));
