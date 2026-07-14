import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { FileStorage, normalizeStorageKey, PutFileInput, StoredFile } from "./fileStorage";

export type S3CompatibleStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
};

export class S3CompatibleFileStorage implements FileStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3CompatibleStorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async put(input: PutFileInput): Promise<StoredFile> {
    const key = normalizeStorageKey(input.key);
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
    }));
    return { key, sizeBytes: input.body.byteLength, contentType: input.contentType };
  }

  async get(key: string): Promise<Readable> {
    const output = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: normalizeStorageKey(key) }));
    if (!output.Body || !(output.Body instanceof Readable)) throw new Error("S3 object response is not a readable stream");
    return output.Body;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: normalizeStorageKey(key) }));
      return true;
    } catch (error: unknown) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (statusCode === 404 || (error as { name?: string }).name === "NotFound") return false;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: normalizeStorageKey(key) }));
  }
}
