import { Router } from "express";
import { licenseRouter } from "./modules/licenses/license.routes";

export const router = Router();

router.use("/", licenseRouter);
