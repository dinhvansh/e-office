import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { AuthController } from "./auth.controller";
import { authGuard } from "./auth.middleware";

const controller = new AuthController();

export const authRouter = Router();

authRouter.post("/login", asyncHandler(controller.login));
authRouter.post("/refresh", asyncHandler(controller.refresh));
authRouter.get("/me", authGuard, asyncHandler(controller.me));
