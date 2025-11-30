import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { WebhooksController } from "./webhooks.controller";

const controller = new WebhooksController();

export const webhooksRouter = Router();

webhooksRouter.get("/", authGuard, asyncHandler(controller.list));
webhooksRouter.post("/", authGuard, asyncHandler(controller.create));
webhooksRouter.get("/:id", authGuard, asyncHandler(controller.getById));
webhooksRouter.put("/:id", authGuard, asyncHandler(controller.update));
webhooksRouter.delete("/:id", authGuard, asyncHandler(controller.delete));
webhooksRouter.get("/:id/logs", authGuard, asyncHandler(controller.getLogs));

// Legacy endpoint
webhooksRouter.post("/register", authGuard, asyncHandler(controller.create));
