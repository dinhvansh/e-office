import { promises as fs } from "node:fs";
import path from "node:path";
import { ObjectStorage, StorageObject } from "./objectStorage";

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly basePath: string) {}

  private resolveKey(key: string): string {
    const normalizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalizedKey || normalizedKey.split("/").includes("..")) {
      throw new Error("Invalid storage object key");
    }
    const resolved = path.resolve(this.basePath, normalizedKey);
    const base = path.resolve(this.basePath);
    if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
      throw new Error("Storage object key escapes the configured base path");
    }
    return resolved;
  }

  async put(object: StorageObject): Promise<string> {
    const target = this.resolveKey(object.key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, object.body);
    return object.key;
  }

  async get(key: string): Promise<Uint8Array> {
    return fs.readFile(this.resolveKey(key));
  }

  async remove(key: string): Promise<void> {
    await fs.unlink(this.resolveKey(key));
  }
}
