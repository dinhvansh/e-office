import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { AuthController } from "./auth.controller";
import { authGuard } from "./auth.middleware";
import { authLimiter } from "../../middleware/rate-limiter";

const controller = new AuthController();

export const authRouter = Router();

// Apply rate limiting to auth endpoints
authRouter.post("/login", authLimiter, asyncHandler(controller.login));
authRouter.post("/refresh", authLimiter, asyncHandler(controller.refresh));
authRouter.get("/me", authGuard, asyncHandler(controller.me));
