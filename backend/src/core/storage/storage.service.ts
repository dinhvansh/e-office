import { env } from "../../config/env";
import { FileStorage } from "./fileStorage";
import { LocalFileStorage } from "./localFileStorage";
import { S3CompatibleFileStorage } from "./s3CompatibleFileStorage";

function createFileStorage(): FileStorage {
  if (env.FILE_STORAGE_DRIVER === "local") {
    return new LocalFileStorage(process.cwd());
  }

  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error("S3 storage requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY");
  }
  return new S3CompatibleFileStorage({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  });
}

/** Runtime-selected storage. Domain services only persist portable storage keys. */
export const storageService = createFileStorage();
