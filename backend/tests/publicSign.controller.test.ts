import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { Readable } from "node:stream";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { ApiError } from "../src/core/errors/api-error";
import { env } from "../src/config/env";
import { prisma } from "../src/config/prisma";
import { storageService } from "../src/core/storage/storage.service";
import { PublicSignController } from "../src/modules/public/publicSign.controller";
import { PublicSigningCommandService } from "../src/modules/public/publicSigningCommand.service";
import { createSigningSession, SIGNING_SESSION_COOKIE } from "../src/modules/public/signingSession.service";

const originalFindUnique = prisma.signers.findUnique;
const originalStorageGet = storageService.get;

const replaceFindUnique = (value: unknown) => {
  (prisma.signers as unknown as { findUnique: unknown }).findUnique = value;
};

const replaceStorageGet = (value: unknown) => {
  (storageService as unknown as { get: unknown }).get = value;
};

afterEach(() => {
  replaceFindUnique(originalFindUnique);
  replaceStorageGet(originalStorageGet);
});

const signer = {
  id: 10,
  signing_token: "invitation-token",
  sign_request_id: 20,
  otp: "otp-hash",
  status: "pending",
  sign_request: {
    id: 20,
    workflow_type: "parallel",
    tenant_id: 1,
    document_id: 30,
    document: { id: 30, file_path: "documents/original.pdf", original_file_name: "original.pdf" },
  },
};

function response() {
  const headers = new Map<string, string>();
  let body: unknown;
  return {
    headers,
    get body() { return body; },
    setHeader(name: string, value: string) { headers.set(name, value); },
    send(value: unknown) { body = value; },
    json(value: unknown) { body = value; },
  };
}

const controllerRequest = (cookie?: string) => ({
  params: { token: "invitation-token" },
  headers: cookie ? { cookie } : {},
}) as unknown as Request;

test("an invitation token cannot fetch the original PDF before OTP verification", async () => {
  let storageReads = 0;
  replaceFindUnique(async () => signer);
  replaceStorageGet(async () => { storageReads += 1; return Readable.from(Buffer.from("pdf")); });

  await assert.rejects(new PublicSignController().getDocument(controllerRequest(), response() as unknown as Response), (error: unknown) =>
    error instanceof ApiError && error.code === "SIGNING_SESSION_INVALID",
  );
  assert.equal(storageReads, 0);
});

test("a verified signing session can fetch the original PDF", async () => {
  replaceFindUnique(async () => signer);
  replaceStorageGet(async () => Readable.from(Buffer.from("pdf")));
  const res = response();
  const session = createSigningSession(signer.id, signer.sign_request_id, signer.otp);

  await new PublicSignController().getDocument(controllerRequest(`${SIGNING_SESSION_COOKIE}=${encodeURIComponent(session)}`), res as unknown as Response);
  assert.deepEqual(res.body, Buffer.from("pdf"));
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
});

test("an expired signing session cannot fetch the original PDF", async () => {
  let storageReads = 0;
  replaceFindUnique(async () => signer);
  replaceStorageGet(async () => { storageReads += 1; return Readable.from(Buffer.from("pdf")); });
  const expired = jwt.sign(
    { signerId: signer.id, signRequestId: signer.sign_request_id, otpFingerprint: signer.otp, purpose: "external_signing" },
    env.JWT_SECRET,
    { expiresIn: -1 },
  );

  await assert.rejects(new PublicSignController().getDocument(controllerRequest(`${SIGNING_SESSION_COOKIE}=${encodeURIComponent(expired)}`), response() as unknown as Response), (error: unknown) =>
    error instanceof ApiError && error.code === "SIGNING_SESSION_EXPIRED",
  );
  assert.equal(storageReads, 0);
});

test("a post-sign session cannot submit another signature", async () => {
  replaceFindUnique(async () => ({ ...signer, status: "signed" }));
  const session = createSigningSession(signer.id, signer.sign_request_id, signer.otp);

  await assert.rejects(new PublicSigningCommandService().submit({
    invitationToken: signer.signing_token,
    signingSession: session,
    otp: "123456",
    fieldValues: [],
  }), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
});

test("OTP verification reports the stable OTP_INVALID code", async () => {
  replaceFindUnique(async () => ({
    ...signer,
    otp: await bcrypt.hash("123456", 4),
    otp_expire: new Date(Date.now() + 60_000),
  }));

  await assert.rejects(new PublicSignController().verifyOtp({
    params: { token: signer.signing_token },
    body: { otp: "000000" },
  } as unknown as Request, response() as unknown as Response), (error: unknown) => error instanceof ApiError && error.code === "OTP_INVALID");
});
