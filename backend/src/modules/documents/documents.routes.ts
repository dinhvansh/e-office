import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { DocumentsController } from "./documents.controller";

const controller = new DocumentsController();

export const documentsRouter = Router();

documentsRouter.use(authGuard);
documentsRouter.get("/", asyncHandler(controller.list));
documentsRouter.get("/:id", asyncHandler(controller.getById));
documentsRouter.post("/", asyncHandler(controller.create));
documentsRouter.delete("/:id", asyncHandler(controller.delete));
