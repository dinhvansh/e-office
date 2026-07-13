import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { ApiError } from "../src/core/errors/api-error";
import { prisma } from "../src/config/prisma";
import { signersRepository } from "../src/modules/signers/signers.repository";
import { signRequestsService } from "../src/modules/signRequests/signRequests.service";

const originals = {
  getSignRequest: signRequestsService.getSignRequest,
  signerFindFirst: prisma.signers.findFirst,
  userFindUnique: prisma.users.findUnique,
  findBySignRequest: signersRepository.findBySignRequest,
};

function replace(target: object, key: string, value: unknown) {
  (target as Record<string, unknown>)[key] = value;
}

afterEach(() => {
  replace(signRequestsService, "getSignRequest", originals.getSignRequest);
  replace(prisma.signers, "findFirst", originals.signerFindFirst);
  replace(prisma.users, "findUnique", originals.userFindUnique);
  replace(signersRepository, "findBySignRequest", originals.findBySignRequest);
});

test("an internal order-two signer gets 409 SIGNING_ORDER_VIOLATION before order one completes", async () => {
  replace(signRequestsService, "getSignRequest", async () => ({ workflow_type: "sequential", document_id: 30 }));
  replace(prisma.users, "findUnique", async () => ({ email: "second@example.test" }));
  replace(prisma.signers, "findFirst", async () => ({
    id: 20,
    sign_request_id: 10,
    signing_order: 2,
    status: "pending",
    name: "Second signer",
  }));
  replace(signersRepository, "findBySignRequest", async () => [
    { id: 11, signing_order: 1, status: "pending", name: "First signer" },
    { id: 20, signing_order: 2, status: "pending", name: "Second signer" },
  ]);

  await assert.rejects(signRequestsService.signInternal(
    10,
    2,
    1,
    "signature",
    "drawn",
    "127.0.0.1",
    "test",
  ), (error: unknown) => error instanceof ApiError && error.statusCode === 409 && error.code === "SIGNING_ORDER_VIOLATION");
});
