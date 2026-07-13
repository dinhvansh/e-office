import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requirePermission } from "../../middleware/permission";
import { authGuard } from "../auth/auth.middleware";
import { SignRequestsController } from "./signRequests.controller";

const controller = new SignRequestsController();

export const signRequestsRouter = Router();

signRequestsRouter.use(authGuard);

signRequestsRouter.get("/", requirePermission("sign_requests", "read"), asyncHandler(controller.list));
signRequestsRouter.post("/", requirePermission("sign_requests", "create"), asyncHandler(controller.create));
signRequestsRouter.get("/my-requests", requirePermission("sign_requests", "read"), asyncHandler(controller.getMyRequests));

signRequestsRouter.put(
  "/:id/signers/reorder",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.reorderSigners)
);
signRequestsRouter.post(
  "/:id/signers",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.addSigner)
);
signRequestsRouter.delete(
  "/:id/signers/:signerId",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.removeSigner)
);
signRequestsRouter.put(
  "/:id/signers/:signerId",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.updateSigner)
);

signRequestsRouter.get(
  "/:id/editor",
  requirePermission("sign_requests", "read"),
  asyncHandler(controller.getEditor)
);
signRequestsRouter.get(
  "/:id/comments",
  requirePermission("sign_requests", "read"),
  asyncHandler(controller.listComments)
);
signRequestsRouter.post(
  "/:id/comments",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.addComment)
);
signRequestsRouter.post(
  "/:id/fields",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.saveFields)
);
signRequestsRouter.patch(
  "/:id/draft-config",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.updateDraftConfig)
);
signRequestsRouter.delete(
  "/:id/fields/:fieldId",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.deleteField)
);
signRequestsRouter.post(
  "/:id/send",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.send)
);
signRequestsRouter.post(
  "/:id/remind",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.remind)
);
signRequestsRouter.post(
  "/:id/cancel",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.cancel)
);
signRequestsRouter.post(
  "/:id/retry-artifact",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.retryArtifact)
);
signRequestsRouter.post(
  "/:id/revoke",
  requirePermission("sign_requests", "update"),
  asyncHandler(controller.revoke)
);
signRequestsRouter.post(
  "/:id/sign-internal",
  requirePermission("sign_requests", "read"),
  asyncHandler(controller.signInternal)
);
signRequestsRouter.post(
  "/:id/reject-internal",
  requirePermission("sign_requests", "read"),
  asyncHandler(controller.rejectInternal)
);

signRequestsRouter.get("/:id(\\d+)", requirePermission("sign_requests", "read"), asyncHandler(controller.getById));
signRequestsRouter.delete(
  "/:id(\\d+)",
  requirePermission("sign_requests", "delete"),
  asyncHandler(controller.delete)
);
