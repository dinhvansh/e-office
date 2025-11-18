import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { WebhooksController } from "./webhooks.controller";

const controller = new WebhooksController();

export const webhooksRouter = Router();

webhooksRouter.post("/register", authGuard, asyncHandler(controller.register));
