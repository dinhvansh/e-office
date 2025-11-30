import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { TenantsController } from "./tenants.controller";

const controller = new TenantsController();

export const tenantsRouter = Router();

// Protected routes (require authentication)
tenantsRouter.get("/me", authGuard, asyncHandler(controller.me));
tenantsRouter.get("/me/stats", authGuard, asyncHandler(controller.stats));

// Public route for SaaS onboarding
tenantsRouter.post("/create-with-admin", asyncHandler(controller.createWithAdmin));
