import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requirePermission } from "../../middleware/permission";
import { authGuard } from "../auth/auth.middleware";
import { SignersController } from "./signers.controller";

const controller = new SignersController();

export const signersRouter = Router();

signersRouter.use(authGuard);
signersRouter.post("/", requirePermission("sign_requests", "update"), asyncHandler(controller.addSigner));
signersRouter.post("/:id/send-otp", requirePermission("sign_requests", "update"), asyncHandler(controller.sendOtp));
signersRouter.post("/:id/sign", requirePermission("sign_requests", "read"), asyncHandler(controller.sign));
