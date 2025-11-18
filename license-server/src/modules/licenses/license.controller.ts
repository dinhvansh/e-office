import { Request, Response } from "express";
import { z } from "zod";
import { licenseService } from "./license.service";
import { licenseStore } from "./license.store";

const activationSchema = z.object({
  license_key: z.string().min(4),
  server_id: z.string().min(3),
});

const offlineSchema = z.object({
  license_key: z.string().min(4),
  hardware_id: z.string().min(3),
  expire_date: z.string().min(4),
  allowed_users: z.coerce.number().int().positive(),
  allowed_docs: z.coerce.number().int().positive(),
});

const validateSchema = z.object({
  token: z.string().min(10),
});

export class LicenseController {
  activate = (req: Request, res: Response) => {
    const body = activationSchema.parse(req.body);
    const result = licenseService.activate(body.license_key, body.server_id);
    res.json({ success: true, data: result });
  };

  generateOfflineLicense = (req: Request, res: Response) => {
    const body = offlineSchema.parse(req.body);
    const record = licenseStore.findByKey(body.license_key);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: "Unknown license key" },
      });
    }
    const payload = licenseService.createPayloadFromRecord(record, {
      license_key: body.license_key,
      hardware_id: body.hardware_id,
      expire_date: body.expire_date,
      allowed_users: body.allowed_users,
      allowed_docs: body.allowed_docs,
    });
    const token = licenseService.generateOfflineLicense(payload);
    res.json({ success: true, data: { token, payload } });
  };

  validateOfflineLicense = (req: Request, res: Response) => {
    const body = validateSchema.parse(req.body);
    const result = licenseService.validateOfflineLicense(body.token);
    res.json({ success: true, data: result });
  };
}
