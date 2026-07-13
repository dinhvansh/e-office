import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { ApiError } from "../src/core/errors/api-error";
import { prisma } from "../src/config/prisma";
import { PublicSigningCommandService } from "../src/modules/public/publicSigningCommand.service";
import { createSigningSession } from "../src/modules/public/signingSession.service";

const originalFindUnique = prisma.signers.findUnique;
const originalFindMany = prisma.signers.findMany;

function replace(target: object, key: string, value: unknown) {
  (target as Record<string, unknown>)[key] = value;
}

afterEach(() => {
  replace(prisma.signers, "findUnique", originalFindUnique);
  replace(prisma.signers, "findMany", originalFindMany);
});

test("an order-two public signer receives SIGNING_ORDER_VIOLATION before order one completes", async () => {
  const signer = {
    id: 20,
    sign_request_id: 10,
    signing_token: "order-two-token",
    signing_order: 2,
    otp: "otp-fingerprint",
    otp_expire: new Date(Date.now() + 60_000),
    status: "pending",
    sign_request: { workflow_type: "sequential", document_id: 30, tenant_id: 1 },
  };
  replace(prisma.signers, "findUnique", async () => signer);
  replace(prisma.signers, "findMany", async () => [
    { id: 11, signing_order: 1, status: "pending", name: "First signer", email: "first@example.test" },
    signer,
  ]);

  const session = createSigningSession(signer.id, signer.sign_request_id, signer.otp);
  await assert.rejects(new PublicSigningCommandService().submit({
    invitationToken: signer.signing_token,
    signingSession: session,
    otp: "123456",
    fieldValues: [],
  }), (error: unknown) => error instanceof ApiError && error.code === "SIGNING_ORDER_VIOLATION");
});
