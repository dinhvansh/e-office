import { Router } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { authGuard } from "../auth/auth.middleware";
import { externalOrgsController } from "./external-orgs.controller";

const router = Router();

router.use(authGuard);

router.get("/", asyncHandler(externalOrgsController.getAll.bind(externalOrgsController)));
router.get("/stats", asyncHandler(externalOrgsController.getStats.bind(externalOrgsController)));
router.get("/:id", asyncHandler(externalOrgsController.getById.bind(externalOrgsController)));
router.post("/", asyncHandler(externalOrgsController.create.bind(externalOrgsController)));
router.put("/:id", asyncHandler(externalOrgsController.update.bind(externalOrgsController)));
router.delete("/:id", asyncHandler(externalOrgsController.delete.bind(externalOrgsController)));

export { router as externalOrgsRouter };
