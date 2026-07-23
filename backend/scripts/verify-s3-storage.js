const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { randomUUID } = require("node:crypto");

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  if (process.env.FILE_STORAGE_DRIVER !== "s3") {
    throw new Error("FILE_STORAGE_DRIVER must be s3");
  }

  const endpoint = required("S3_ENDPOINT");
  const region = required("S3_REGION");
  const bucket = required("S3_BUCKET");
  const accessKeyId = required("S3_ACCESS_KEY_ID");
  const secretAccessKey = required("S3_SECRET_ACCESS_KEY");
  const key = `storage/system-check/${randomUUID()}.txt`;
  const expected = Buffer.from("e-office-s3-storage-check", "utf8");

  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: expected,
      ContentType: "text/plain",
    }));
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) throw new Error("S3 returned an empty response body");
    const actual = Buffer.from(await response.Body.transformToByteArray());
    if (!actual.equals(expected)) throw new Error("S3 read-back content did not match");
  } finally {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  console.log(`S3 storage check passed: ${endpoint}/${bucket}`);
  console.log("Temporary check object was deleted.");
}

main().catch((error) => {
  console.error(`[verify-s3-storage] ${error.message}`);
  process.exitCode = 1;
});
