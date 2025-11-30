import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { AuthController } from "./auth.controller";
import { authGuard } from "./auth.middleware";
import { authLimiter } from "../../middleware/rate-limiter";
import { passwordResetController } from "./passwordReset.controller";
import { registrationController } from "./registration.controller";

const controller = new AuthController();

export const authRouter = Router();

// Apply rate limiting to auth endpoints (DISABLED FOR TESTING)
// authRouter.post("/login", authLimiter, asyncHandler(controller.login));
// authRouter.post("/refresh", authLimiter, asyncHandler(controller.refresh));
authRouter.post("/login", asyncHandler(controller.login));
authRouter.post("/refresh", asyncHandler(controller.refresh));
authRouter.get("/me", authGuard, asyncHandler(controller.me));

// Password reset endpoints
authRouter.post("/forgot-password", asyncHandler(passwordResetController.requestPasswordReset.bind(passwordResetController)));
authRouter.get("/verify-reset-token/:token", asyncHandler(passwordResetController.verifyResetToken.bind(passwordResetController)));
authRouter.post("/reset-password", asyncHandler(passwordResetController.resetPassword.bind(passwordResetController)));

// Registration endpoint (public)
authRouter.post("/register", asyncHandler(registrationController.register.bind(registrationController)));
