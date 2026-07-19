import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../auth/auth.middleware";
import { requirePermission } from "../../middleware/permission";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { archiveService } from "./archive.service";
import { ok } from "../../core/utils/response";

export const archiveRouter = Router();
archiveRouter.use(authGuard);
archiveRouter.get("/documents", requirePermission("archive", "view"), asyncHandler(async (req, res) => res.json(ok({ documents: await archiveService.list(req.auth!.tenantId, typeof req.query.search === "string" ? req.query.search : undefined) }))));
archiveRouter.get("/documents/:id", requirePermission("archive", "view"), asyncHandler(async (req, res) => res.json(ok({ document: await archiveService.get(req.auth!.tenantId, z.coerce.number().int().positive().parse(req.params.id)) }))));
archiveRouter.post("/documents/:id/restore", requirePermission("archive", "restore"), asyncHandler(async (req, res) => res.json(ok(await archiveService.restore(req.auth!.tenantId, z.coerce.number().int().positive().parse(req.params.id), req.auth!.userId)))));
// Permanent deletion is deliberately not exposed: retention/storage/outbox policy is not implemented.
