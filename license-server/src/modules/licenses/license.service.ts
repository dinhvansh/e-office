import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { LicenseRecord, licenseStore } from "./license.store";

export type ActivationResult = {
  status: "active" | "expired" | "invalid";
  expire_date?: string;
  allowed_users?: number;
  allowed_docs?: number;
  features?: string[];
};

export type OfflineLicensePayload = {
  license_key: string;
  hardware_id: string;
  expire_date: string;
  allowed_users: number;
  allowed_docs: number;
  issued_at: string;
};

class LicenseService {
  activate(licenseKey: string, serverId: string): ActivationResult {
    if (!licenseKey || !serverId) {
      return { status: "invalid" };
    }
    const record = licenseStore.findByKey(licenseKey);
    if (!record) {
      return { status: "invalid" };
    }
    const expired = new Date(record.expireDate) < new Date();
    if (expired) {
      return {
        status: "expired",
        expire_date: record.expireDate,
      };
    }
    return {
      status: "active",
      expire_date: record.expireDate,
      allowed_users: record.allowedUsers,
      allowed_docs: record.allowedDocs,
      features: record.features,
    };
  }

  generateOfflineLicense(payload: OfflineLicensePayload): string {
    return jwt.sign(payload, env.LICENSE_SIGNING_SECRET, {
      expiresIn: "30d",
    });
  }

  validateOfflineLicense(token: string): { valid: boolean; payload?: OfflineLicensePayload; error?: string } {
    try {
      const decoded = jwt.verify(token, env.LICENSE_SIGNING_SECRET) as OfflineLicensePayload;
      return { valid: true, payload: decoded };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : "INVALID_LICENSE",
      };
    }
  }

  createPayloadFromRecord(record: LicenseRecord, overrides: Partial<OfflineLicensePayload>): OfflineLicensePayload {
    return {
      license_key: overrides.license_key ?? record.licenseKey,
      hardware_id: overrides.hardware_id ?? "unknown",
      expire_date: overrides.expire_date ?? record.expireDate,
      allowed_users: overrides.allowed_users ?? record.allowedUsers,
      allowed_docs: overrides.allowed_docs ?? record.allowedDocs,
      issued_at: new Date().toISOString(),
    };
  }
}

export const licenseService = new LicenseService();
