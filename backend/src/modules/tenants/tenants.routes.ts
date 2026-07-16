import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { strictLimiter } from "../../middleware/rate-limiter";
import { authGuard } from "../auth/auth.middleware";
import { requirePermission } from "../../middleware/permission";
import { TenantsController } from "./tenants.controller";

const controller = new TenantsController();

export const tenantsRouter = Router();

// Protected routes (require authentication)
tenantsRouter.get("/me", authGuard, asyncHandler(controller.me));
tenantsRouter.get("/me/stats", authGuard, asyncHandler(controller.stats));
tenantsRouter.put("/me", authGuard, requirePermission("settings", "update"), asyncHandler(controller.updateMe));

// Public route for SaaS onboarding
tenantsRouter.post("/create-with-admin", strictLimiter, asyncHandler(controller.createWithAdmin));
