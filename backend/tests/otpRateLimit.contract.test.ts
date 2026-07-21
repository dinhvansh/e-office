import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const backendRoot = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(backendRoot, relativePath), "utf8");

test("public OTP send applies independent IP and invitation-token limiters", () => {
  const routes = read("src/modules/public/publicSign.routes.ts");
  const limiter = read("src/middleware/rate-limiter.ts");

  assert.match(routes, /post\('\/:token\/send-otp', publicSendOtpIpLimiter, publicSendOtpLimiter/);
  assert.match(limiter, /export const publicSendOtpIpLimiter/);
  assert.match(limiter, /export const publicSendOtpLimiter/);
  assert.match(limiter, /createHash\(['"]sha256['"]\)\.update\(String\(req\.params\.token/);
  assert.match(limiter, /OTP_SEND_RATE_LIMITED/);
});

test("OTP state is persisted and reset atomically when a new code is claimed", () => {
  const service = read("src/modules/signers/signers.service.ts");
  assert.match(service, /otp_sent_at/);
  assert.match(service, /otp_verified_at: null/);
  assert.match(service, /otp_attempt_count: 0/);
  assert.match(service, /status: \{ in: \["pending", "otp_sent"\] \}/);
  assert.match(service, /OTP_RESEND_COOLDOWN/);
});
