import { promises as fs } from "fs";
import path from "path";
import { env } from "../../config/env";

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export const saveBase64Document = async (tenantId: number, fileName: string, base64: string): Promise<string> => {
  const tenantDir = path.join(env.STORAGE_BASE_PATH, tenantId.toString());
  await ensureDir(tenantDir);
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const filePath = path.join(tenantDir, `${Date.now()}_${safeName}`);
  const buffer = Buffer.from(base64, "base64");
  await fs.writeFile(filePath, buffer);
  return filePath;
};
