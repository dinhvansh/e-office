import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { TenantsController } from "./tenants.controller";

const controller = new TenantsController();

export const tenantsRouter = Router();

tenantsRouter.get("/me", authGuard, asyncHandler(controller.me));
