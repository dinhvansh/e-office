import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requirePermission } from "../../middleware/permission";
import { authGuard } from "../auth/auth.middleware";
import { WebhooksController } from "./webhooks.controller";

const controller = new WebhooksController();

export const webhooksRouter = Router();

webhooksRouter.get("/api-tokens", authGuard, requirePermission("webhooks", "read"), asyncHandler(controller.listApiTokens));
webhooksRouter.post("/api-tokens", authGuard, requirePermission("webhooks", "create"), asyncHandler(controller.createApiToken));
webhooksRouter.delete("/api-tokens/:tokenId", authGuard, requirePermission("webhooks", "delete"), asyncHandler(controller.revokeApiToken));

webhooksRouter.get("/", authGuard, requirePermission("webhooks", "read"), asyncHandler(controller.list));
webhooksRouter.post("/", authGuard, requirePermission("webhooks", "create"), asyncHandler(controller.create));
webhooksRouter.get("/:id", authGuard, requirePermission("webhooks", "read"), asyncHandler(controller.getById));
webhooksRouter.put("/:id", authGuard, requirePermission("webhooks", "update"), asyncHandler(controller.update));
webhooksRouter.delete("/:id", authGuard, requirePermission("webhooks", "delete"), asyncHandler(controller.delete));
webhooksRouter.get("/:id/logs", authGuard, requirePermission("webhooks", "read"), asyncHandler(controller.getLogs));

// Legacy endpoint
webhooksRouter.post("/register", authGuard, requirePermission("webhooks", "create"), asyncHandler(controller.create));
