import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { SignRequestsController } from "./signRequests.controller";

const controller = new SignRequestsController();

export const signRequestsRouter = Router();

signRequestsRouter.use(authGuard);
signRequestsRouter.get("/", asyncHandler(controller.list));
signRequestsRouter.post("/", asyncHandler(controller.create));

// My requests route (must come before /:id)
signRequestsRouter.get("/my-requests", asyncHandler(controller.getMyRequests));

// Specific routes MUST come before generic /:id route
// Signers management routes
signRequestsRouter.put("/:id/signers/reorder", asyncHandler(controller.reorderSigners)); // ✅ Reorder (must come before /:signerId)
signRequestsRouter.post("/:id/signers", asyncHandler(controller.addSigner));
signRequestsRouter.delete("/:id/signers/:signerId", asyncHandler(controller.removeSigner)); // ✅ Phase 2
signRequestsRouter.put("/:id/signers/:signerId", asyncHandler(controller.updateSigner)); // ✅ Phase 2

// Field management routes
signRequestsRouter.get("/:id/editor", asyncHandler(controller.getEditor));
signRequestsRouter.post("/:id/fields", asyncHandler(controller.saveFields));
signRequestsRouter.delete("/:id/fields/:fieldId", asyncHandler(controller.deleteField));
signRequestsRouter.post("/:id/send", asyncHandler(controller.send));
signRequestsRouter.post("/:id/cancel", asyncHandler(controller.cancel));
signRequestsRouter.post("/:id/revoke", asyncHandler(controller.revoke)); // ✅ Revoke completed internal document
signRequestsRouter.post("/:id/sign-internal", asyncHandler(controller.signInternal)); // ✅ Internal signing

// Generic routes MUST come last - use regex to match only numeric IDs
signRequestsRouter.get("/:id(\\d+)", asyncHandler(controller.getById));
signRequestsRouter.delete("/:id(\\d+)", asyncHandler(controller.delete)); // ✅ Delete draft
