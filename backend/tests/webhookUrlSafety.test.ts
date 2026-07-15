import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeWebhookUrl } from "../src/modules/webhooks/webhookUrlSafety";

test("webhook SSRF guard rejects loopback and private literal addresses", async () => {
  for (const value of ["http://localhost/hook", "http://127.0.0.1/hook", "http://10.0.0.1/hook", "http://172.16.0.1/hook", "http://192.168.1.1/hook", "http://169.254.1.1/hook", "http://[::1]/hook"]) {
    await assert.rejects(assertSafeWebhookUrl(value));
  }
});

test("webhook SSRF guard permits public HTTPS destinations", async () => {
  await assert.doesNotReject(assertSafeWebhookUrl("https://example.com/webhook"));
});
