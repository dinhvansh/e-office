import crypto from "node:crypto";
import path from "node:path";
import { env } from "../../config/env";
import { storageService } from "../storage/storage.service";

export const saveBase64Document = async (tenantId: number, fileName: string, base64: string): Promise<string> => {
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9_.-]/g, "_") || "document";
  const buffer = Buffer.from(base64, "base64");
  const storagePrefix = env.STORAGE_BASE_PATH.replace(/^[.][\\/]/, "").replace(/\\/g, "/").replace(/\/+$/, "");
  const key = path.posix.join(storagePrefix, String(tenantId), `${Date.now()}_${crypto.randomUUID()}_${safeName}`);
  return (await storageService.put({ key, body: buffer })).key;
};
