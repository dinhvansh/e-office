import { Router } from "express";
import { LicenseController } from "./license.controller";

const controller = new LicenseController();

export const licenseRouter = Router();

licenseRouter.post("/activate", controller.activate);
licenseRouter.post("/generate-offline-license", controller.generateOfflineLicense);
licenseRouter.post("/validate-offline-license", controller.validateOfflineLicense);
