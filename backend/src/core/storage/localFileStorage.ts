import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { FileStorage, normalizeStorageKey, PutFileInput, StoredFile } from "./fileStorage";

export class LocalFileStorage implements FileStorage {
  private readonly resolvedBasePath: string;

  constructor(basePath: string) {
    this.resolvedBasePath = path.resolve(basePath);
  }

  private resolveKey(key: string): string {
    const normalizedKey = normalizeStorageKey(key);
    const resolved = path.resolve(this.resolvedBasePath, normalizedKey);
    if (!resolved.startsWith(`${this.resolvedBasePath}${path.sep}`)) {
      throw new Error("Storage object key escapes the configured base path");
    }
    return resolved;
  }

  async put(input: PutFileInput): Promise<StoredFile> {
    const key = normalizeStorageKey(input.key);
    const target = this.resolveKey(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, input.body);
    return { key, sizeBytes: input.body.byteLength, contentType: input.contentType };
  }

  async get(key: string) {
    const target = this.resolveKey(key);
    await fs.access(target);
    return createReadStream(target);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolveKey(key));
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
