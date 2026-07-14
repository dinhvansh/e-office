import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import test from "node:test";
import { LocalFileStorage } from "../src/core/storage/localFileStorage";
import { readStoredFile } from "../src/core/storage/fileStorage";
import { S3CompatibleFileStorage } from "../src/core/storage/s3CompatibleFileStorage";

test("local file storage put/get/exists/delete uses portable keys", async () => {
  const basePath = path.join(process.cwd(), ".test-storage");
  const storage = new LocalFileStorage(basePath);
  const key = "storage/42/example.txt";

  try {
    assert.deepEqual(await storage.put({ key, body: Buffer.from("hello"), contentType: "text/plain" }), {
      key,
      sizeBytes: 5,
      contentType: "text/plain",
    });
    assert.equal(await storage.exists(key), true);
    assert.equal((await readStoredFile(storage, key)).toString(), "hello");
    await storage.delete(key);
    await storage.delete(key);
    assert.equal(await storage.exists(key), false);
  } finally {
    await fs.rm(basePath, { recursive: true, force: true });
  }
});

test("local file storage rejects traversal and handles missing files safely", async () => {
  const storage = new LocalFileStorage(path.join(process.cwd(), ".test-storage"));
  await assert.rejects(storage.put({ key: "storage/../outside.txt", body: Buffer.from("no") }));
  await assert.rejects(storage.get("../outside.txt"));
  await assert.rejects(storage.get("/etc/passwd"));
  assert.equal(await storage.exists("storage/../outside.txt"), false);
});

test("S3-compatible adapter maps the file storage contract to its transport", async () => {
  const storage = new S3CompatibleFileStorage({
    endpoint: "http://minio.invalid",
    region: "us-east-1",
    bucket: "eoffice",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
  });
  const calls: string[] = [];
  (storage as unknown as { client: { send(command: { constructor: { name: string } }): Promise<unknown> } }).client.send = async (command) => {
    calls.push(command.constructor.name);
    if (command.constructor.name === "GetObjectCommand") return { Body: Readable.from(Buffer.from("pdf")) };
    return {};
  };

  assert.equal((await storage.put({ key: "storage/7/file.pdf", body: Buffer.from("pdf") })).key, "storage/7/file.pdf");
  assert.equal((await readStoredFile(storage, "storage/7/file.pdf")).toString(), "pdf");
  assert.equal(await storage.exists("storage/7/file.pdf"), true);
  await storage.delete("storage/7/file.pdf");
  assert.deepEqual(calls, ["PutObjectCommand", "GetObjectCommand", "HeadObjectCommand", "DeleteObjectCommand"]);
});

test("invalid FILE_STORAGE_DRIVER fails startup validation", () => {
  const result = spawnSync(process.execPath, ["-e", "require('./.test-dist/src/config/env.js')"], {
    cwd: process.cwd(),
    env: { ...process.env, FILE_STORAGE_DRIVER: "invalid" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FILE_STORAGE_DRIVER/);
});
