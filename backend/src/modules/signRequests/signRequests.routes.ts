import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { SignRequestsController } from "./signRequests.controller";

const controller = new SignRequestsController();

export const signRequestsRouter = Router();

signRequestsRouter.use(authGuard);
signRequestsRouter.get("/", asyncHandler(controller.list));
signRequestsRouter.post("/", asyncHandler(controller.create));

// Specific routes MUST come before generic /:id route
// Signers management routes
signRequestsRouter.post("/:id/signers", asyncHandler(controller.addSigner));

// Field management routes
signRequestsRouter.get("/:id/editor", asyncHandler(controller.getEditor));
signRequestsRouter.post("/:id/fields", asyncHandler(controller.saveFields));
signRequestsRouter.delete("/:id/fields/:fieldId", asyncHandler(controller.deleteField));
signRequestsRouter.post("/:id/send", asyncHandler(controller.send));
signRequestsRouter.post("/:id/cancel", asyncHandler(controller.cancel));

// Generic routes MUST come last - use regex to match only numeric IDs
signRequestsRouter.get("/:id(\\d+)", asyncHandler(controller.getById));
