export type StorageObject = {
  key: string;
  body: Uint8Array;
  contentType?: string;
};

export interface ObjectStorage {
  put(object: StorageObject): Promise<string>;
  get(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}

/**
 * Minimal transport contract for AWS S3 and compatible services (MinIO, R2,
 * Ceph). An SDK-specific client can implement this without leaking into domain
 * commands.
 */
export interface S3CompatibleClient {
  putObject(input: StorageObject): Promise<void>;
  getObject(key: string): Promise<Uint8Array>;
  deleteObject(key: string): Promise<void>;
}

export class S3CompatibleObjectStorage implements ObjectStorage {
  constructor(private readonly client: S3CompatibleClient) {}

  async put(object: StorageObject): Promise<string> {
    await this.client.putObject(object);
    return object.key;
  }

  get(key: string): Promise<Uint8Array> {
    return this.client.getObject(key);
  }

  remove(key: string): Promise<void> {
    return this.client.deleteObject(key);
  }
}
