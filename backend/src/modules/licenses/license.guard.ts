import { NextFunction, Request, Response } from "express";
import { licenseService } from "./license.service";

export const requireLicense = () => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await licenseService.ensureLicenseForTenant(req.auth!.tenantId);
    next();
  };
};
