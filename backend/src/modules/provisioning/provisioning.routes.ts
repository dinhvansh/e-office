import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { ApiError } from "../../core/errors/api-error";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { provisioningService } from "./provisioning.service";

const router = Router();
const schema = z.object({ workspace_name: z.string().min(1), owner_email: z.string().email(), owner_full_name: z.string().min(1), password_hash: z.string().min(20) }).strict();
router.post("/workspaces", asyncHandler(async (req, res) => {
  if (!env.INTERNAL_PROVISIONING_KEY || req.header("x-internal-provisioning-key") !== env.INTERNAL_PROVISIONING_KEY) throw ApiError.forbidden("Invalid internal provisioning credentials", "INTERNAL_PROVISIONING_FORBIDDEN");
  const body = schema.parse(req.body);
  res.status(201).json(await provisioningService.provision({
    workspace_name: body.workspace_name!, owner_email: body.owner_email!, owner_full_name: body.owner_full_name!, password_hash: body.password_hash!,
  }));
}));
export const provisioningRouter = router;
