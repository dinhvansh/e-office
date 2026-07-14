import { Readable } from "node:stream";

export type PutFileInput = {
  key: string;
  body: Uint8Array;
  contentType?: string;
};

export type StoredFile = {
  key: string;
  sizeBytes: number;
  contentType?: string;
};

export interface FileStorage {
  put(input: PutFileInput): Promise<StoredFile>;
  get(key: string): Promise<Readable>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

export async function readStoredFile(storage: FileStorage, key: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of await storage.get(key)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function normalizeStorageKey(key: string): string {
  if (/^(?:[\\/]+|[A-Za-z]:[\\/])/.test(key)) {
    throw new Error("Storage object key must be relative");
  }
  const normalized = key.replace(/\\/g, "/");
  if (!normalized || normalized.includes("\0") || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid storage object key");
  }
  return normalized;
}
