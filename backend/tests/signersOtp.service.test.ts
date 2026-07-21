import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { prisma } from "../src/config/prisma";
import { ApiError } from "../src/core/errors/api-error";
import { emailService } from "../src/modules/common/email.service";
import { signersRepository } from "../src/modules/signers/signers.repository";
import { signersService } from "../src/modules/signers/signers.service";

const originalFindById = signersRepository.findById;
const originalUpdateMany = prisma.signers.updateMany;
const originalSendOtpEmail = emailService.sendOtpEmail;

afterEach(() => {
  (signersRepository as unknown as { findById: unknown }).findById = originalFindById;
  (prisma.signers as unknown as { updateMany: unknown }).updateMany = originalUpdateMany;
  (emailService as unknown as { sendOtpEmail: unknown }).sendOtpEmail = originalSendOtpEmail;
});

const actionableSigner = {
  id: 7,
  email: "external@example.test",
  name: "External Signer",
  status: "pending",
  signing_token: "valid-invitation",
  otp_sent_at: null,
  otp_expire: null,
  sign_request: {
    tenant_id: 3,
    title: "Contract",
    status: "in_progress",
    deadline: new Date(Date.now() + 60_000),
    archived_at: null,
    document: { status: "pending_signature", archived_at: null },
  },
};

test("valid invitation claims and sends one OTP", async () => {
  (signersRepository as unknown as { findById: unknown }).findById = async () => actionableSigner;
  let updateData: Record<string, unknown> | undefined;
  (prisma.signers as unknown as { updateMany: unknown }).updateMany = async ({ data }: { data: Record<string, unknown> }) => {
    updateData = data;
    return { count: 1 };
  };
  let deliveredOtp = "";
  (emailService as unknown as { sendOtpEmail: unknown }).sendOtpEmail = async ({ otp }: { otp: string }) => { deliveredOtp = otp; };

  const result = await signersService.sendOtp(7, 3);

  assert.match(result.otp, /^\d{6}$/);
  assert.equal(deliveredOtp, result.otp);
  assert.equal(result.cooldownSeconds, 30);
  assert.equal(updateData?.status, "otp_sent");
  assert.equal(updateData?.otp_attempt_count, 0);
  assert.equal(updateData?.otp_verified_at, null);
});

test("immediate OTP resend is blocked before another email is sent", async () => {
  (signersRepository as unknown as { findById: unknown }).findById = async () => ({ ...actionableSigner, status: "otp_sent", otp_sent_at: new Date() });
  let deliveryCount = 0;
  (emailService as unknown as { sendOtpEmail: unknown }).sendOtpEmail = async () => { deliveryCount += 1; };

  await assert.rejects(signersService.sendOtp(7, 3), (error: unknown) =>
    error instanceof ApiError && error.code === "OTP_RESEND_COOLDOWN",
  );
  assert.equal(deliveryCount, 0);
});

test("revoked invitation cannot send OTP", async () => {
  (signersRepository as unknown as { findById: unknown }).findById = async () => ({ ...actionableSigner, signing_token: null });
  await assert.rejects(signersService.sendOtp(7, 3), (error: unknown) =>
    error instanceof ApiError && error.code === "INVALID_SIGNING_LINK",
  );
});
