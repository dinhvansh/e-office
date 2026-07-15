import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { prisma } from "../src/config/prisma";
import { signerManagementService } from "../src/modules/signRequests/signerManagement.service";
import { signersRepository } from "../src/modules/signers/signers.repository";

const originals = {
  deleteFields: prisma.sign_request_fields.deleteMany,
  deleteSigner: signersRepository.delete,
  findBySignRequest: signersRepository.findBySignRequest,
  updateSigner: signersRepository.update,
  findInternalUser: prisma.users.findFirst,
};

function replace(target: object, key: string, value: unknown) {
  (target as Record<string, unknown>)[key] = value;
}

afterEach(() => {
  replace(prisma.sign_request_fields, "deleteMany", originals.deleteFields);
  replace(signersRepository, "delete", originals.deleteSigner);
  replace(signersRepository, "findBySignRequest", originals.findBySignRequest);
  replace(signersRepository, "update", originals.updateSigner);
  replace(prisma.users, "findFirst", originals.findInternalUser);
});

test("changing signer email updates the internal user relation", async () => {
  let update: unknown;
  replace(prisma.users, "findFirst", async () => ({ id: 91 }));
  replace(signersRepository, "update", async (_id: number, data: unknown) => {
    update = data;
    return {};
  });

  await signerManagementService.updateSignerRecord(
    12,
    { email: "external@example.test", user_id: null },
    3,
    { email: "member@example.test", name: "Member" },
  );

  assert.deepEqual(update, {
    email: "member@example.test",
    name: "Member",
    is_internal: true,
    user: { connect: { id: 91 } },
  });
});

test("removing a signer clears assigned fields and compacts signing order", async () => {
  const calls: string[] = [];
  replace(prisma.sign_request_fields, "deleteMany", async (input: { where: { assigned_signer_id: number } }) => {
    calls.push(`fields:${input.where.assigned_signer_id}`);
    return { count: 2 };
  });
  replace(signersRepository, "delete", async (id: number) => {
    calls.push(`delete:${id}`);
    return {};
  });
  replace(signersRepository, "findBySignRequest", async (id: number) => {
    calls.push(`list:${id}`);
    return [
      { id: 31, signing_order: 3 },
      { id: 11, signing_order: 1 },
    ];
  });
  replace(signersRepository, "update", async (id: number, data: { signing_order?: number }) => {
    calls.push(`update:${id}:${data.signing_order}`);
    return {};
  });

  await signerManagementService.removeSignerAndReorder(7, 22);

  assert.deepEqual(calls, [
    "fields:22",
    "delete:22",
    "list:7",
    "update:11:1",
    "update:31:2",
  ]);
});
