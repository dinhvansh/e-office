import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { SignRequestsController } from "./signRequests.controller";

const controller = new SignRequestsController();

export const signRequestsRouter = Router();

signRequestsRouter.use(authGuard);
signRequestsRouter.get("/", asyncHandler(controller.list));
signRequestsRouter.post("/", asyncHandler(controller.create));
signRequestsRouter.get("/:id", asyncHandler(controller.getById));
signRequestsRouter.post("/:id/cancel", asyncHandler(controller.cancel));

// Field management routes
signRequestsRouter.get("/:id/editor", asyncHandler(controller.getEditor));
signRequestsRouter.post("/:id/fields", asyncHandler(controller.saveFields));
signRequestsRouter.delete("/:id/fields/:fieldId", asyncHandler(controller.deleteField));
signRequestsRouter.post("/:id/send", asyncHandler(controller.send));
