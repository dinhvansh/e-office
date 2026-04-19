import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { requirePermission } from "../../middleware/permission";
import { authGuard } from "../auth/auth.middleware";
import { externalOrgsController } from "./external-orgs.controller";

const router = Router();

router.use(authGuard);

router.get("/", requirePermission("external_orgs", "read"), asyncHandler(externalOrgsController.getAll.bind(externalOrgsController)));
router.get("/stats", requirePermission("external_orgs", "read"), asyncHandler(externalOrgsController.getStats.bind(externalOrgsController)));
router.get("/:id", requirePermission("external_orgs", "read"), asyncHandler(externalOrgsController.getById.bind(externalOrgsController)));
router.post("/", requirePermission("external_orgs", "create"), asyncHandler(externalOrgsController.create.bind(externalOrgsController)));
router.put("/:id", requirePermission("external_orgs", "update"), asyncHandler(externalOrgsController.update.bind(externalOrgsController)));
router.delete("/:id", requirePermission("external_orgs", "delete"), asyncHandler(externalOrgsController.delete.bind(externalOrgsController)));

export { router as externalOrgsRouter };
