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
import { signersService } from "../src/modules/signers/signers.service";

const originalFindUnique = prisma.signers.findUnique;
const originalStorageGet = storageService.get;
const originalSendOtp = signersService.sendOtp;

const replaceFindUnique = (value: unknown) => {
  (prisma.signers as unknown as { findUnique: unknown }).findUnique = value;
};

const replaceStorageGet = (value: unknown) => {
  (storageService as unknown as { get: unknown }).get = value;
};

afterEach(() => {
  replaceFindUnique(originalFindUnique);
  replaceStorageGet(originalStorageGet);
  (signersService as unknown as { sendOtp: unknown }).sendOtp = originalSendOtp;
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

test("OTP verification creates a short-lived signing session for a valid OTP", async () => {
  replaceFindUnique(async () => ({
    ...signer,
    otp: await bcrypt.hash("123456", 4),
    otp_expire: new Date(Date.now() + 60_000),
  }));
  const res = response();

  await new PublicSignController().verifyOtp({
    params: { token: signer.signing_token },
    body: { otp: "123456" },
  } as unknown as Request, res as unknown as Response);

  assert.deepEqual(res.body, { success: true, data: { verified: true, message: "OTP verified successfully" } });
  assert.match(res.headers.get("Set-Cookie") || "", new RegExp(`${SIGNING_SESSION_COOKIE}=`));
});

test("expired OTP verification returns the stable OTP_EXPIRED code", async () => {
  replaceFindUnique(async () => ({
    ...signer,
    otp: await bcrypt.hash("123456", 4),
    otp_expire: new Date(Date.now() - 60_000),
  }));

  await assert.rejects(new PublicSignController().verifyOtp({
    params: { token: signer.signing_token },
    body: { otp: "123456" },
  } as unknown as Request, response() as unknown as Response), (error: unknown) => error instanceof ApiError && error.code === "OTP_EXPIRED");
});

test("OTP resend returns expiry and cooldown metadata without exposing delivery details", async () => {
  replaceFindUnique(async () => ({ ...signer, email: "signer@example.test" }));
  (signersService as unknown as { sendOtp: unknown }).sendOtp = async () => ({
    otp: "123456",
    expiresAt: new Date("2026-07-14T10:00:00.000Z"),
    cooldownSeconds: 30,
  });
  const res = response();

  await new PublicSignController().sendOtp({
    params: { token: signer.signing_token },
    body: { email: "signer@example.test" },
  } as unknown as Request, res as unknown as Response);

  assert.deepEqual(res.body, { success: true, data: { otp_sent: true, otp_expires_at: "2026-07-14T10:00:00.000Z", resend_cooldown_seconds: 30 } });
});
