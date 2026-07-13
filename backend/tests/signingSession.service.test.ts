import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env";
import { createSigningSession, isSigningSessionValid, PUBLIC_SIGNING_COOKIE_PATH } from "../src/modules/public/signingSession.service";

test("signing-session cookie scope matches the public signing route", () => {
  assert.equal(PUBLIC_SIGNING_COOKIE_PATH, "/public/sign");
});

test("signing session is valid only for its signer and sign request", () => {
  const token = createSigningSession(10, 20, "otp-hash-a");
  assert.equal(isSigningSessionValid(token, 10, 20, "otp-hash-a"), true);
  assert.equal(isSigningSessionValid(token, 11, 20, "otp-hash-a"), false);
  assert.equal(isSigningSessionValid(token, 10, 21, "otp-hash-a"), false);
  assert.equal(isSigningSessionValid(token, 10, 20, "otp-hash-b"), false);
});

test("malformed signing session is rejected", () => {
  assert.equal(isSigningSessionValid("not-a-jwt", 10, 20, "otp-hash-a"), false);
});

test("expired or consumed signing sessions are rejected", () => {
  const expired = jwt.sign(
    { signerId: 10, signRequestId: 20, otpFingerprint: "otp-hash-a", purpose: "external_signing" },
    env.JWT_SECRET,
    { expiresIn: -1 },
  );
  const active = createSigningSession(10, 20, "otp-hash-a");

  assert.equal(isSigningSessionValid(expired, 10, 20, "otp-hash-a"), false);
  assert.equal(isSigningSessionValid(active, 10, 20, null), false);
});
