import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { SignersController } from "./signers.controller";

const controller = new SignersController();

export const signersRouter = Router();

signersRouter.use(authGuard);
signersRouter.post("/", asyncHandler(controller.addSigner));
signersRouter.post("/:id/send-otp", asyncHandler(controller.sendOtp));
signersRouter.post("/:id/sign", asyncHandler(controller.sign));
