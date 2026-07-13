import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { ApiError } from "../src/core/errors/api-error";
import { SignRequestFieldValuesService } from "../src/modules/signRequests/signRequestFieldValues.service";

type Field = { id: number; sign_request_id: number; assigned_signer_id: number | null };
type StoredValue = { field_id: number; signer_id: number; value: unknown };

const signerId = 10;
const signRequestId = 100;

function createTransaction(fields: Field[], values: StoredValue[]): Prisma.TransactionClient {
  const transaction = {
    signers: {
      findUnique: async () => ({ sign_request_id: signRequestId }),
    },
    sign_request_fields: {
      findMany: async (args: { where: { id?: { in: number[] } } }) => {
        const requested = new Set(args.where.id?.in ?? []);
        return fields
          .filter((field) => requested.has(field.id))
          .filter((field) => field.sign_request_id === signRequestId)
          .filter((field) => field.assigned_signer_id === signerId || field.assigned_signer_id === null)
          .map((field) => ({ id: field.id }));
      },
    },
    sign_request_field_values: {
      upsert: async (args: { create: StoredValue }) => {
        values.push(args.create);
      },
    },
  };
  return transaction as unknown as Prisma.TransactionClient;
}

const expectFieldDenied = async (operation: Promise<unknown>) => {
  await assert.rejects(operation, (error: unknown) =>
    error instanceof ApiError && error.statusCode === 403 && error.code === "FIELD_ACCESS_DENIED",
  );
};

test("service rejects another signer's field before writing a value", async () => {
  const values: StoredValue[] = [];
  const tx = createTransaction([{ id: 1, sign_request_id: signRequestId, assigned_signer_id: 11 }], values);

  await expectFieldDenied(new SignRequestFieldValuesService().saveFieldValuesInTransaction(tx, signerId, [{ field_id: 1, value: "blocked" }]));
  assert.deepEqual(values, []);
});

test("service rejects a field from another sign request before writing a value", async () => {
  const values: StoredValue[] = [];
  const tx = createTransaction([{ id: 2, sign_request_id: 101, assigned_signer_id: signerId }], values);

  await expectFieldDenied(new SignRequestFieldValuesService().saveFieldValuesInTransaction(tx, signerId, [{ field_id: 2, value: "blocked" }]));
  assert.deepEqual(values, []);
});

test("service writes a shared field in the signer's sign request", async () => {
  const values: StoredValue[] = [];
  const tx = createTransaction([{ id: 3, sign_request_id: signRequestId, assigned_signer_id: null }], values);

  await new SignRequestFieldValuesService().saveFieldValuesInTransaction(tx, signerId, [{ field_id: 3, value: "allowed" }]);
  assert.deepEqual(values, [{ field_id: 3, signer_id: signerId, value: "allowed" }]);
});

test("mixed field payload is rejected before any upsert occurs", async () => {
  const values: StoredValue[] = [];
  const tx = createTransaction([
    { id: 4, sign_request_id: signRequestId, assigned_signer_id: signerId },
    { id: 5, sign_request_id: signRequestId, assigned_signer_id: 11 },
  ], values);

  await expectFieldDenied(new SignRequestFieldValuesService().saveFieldValuesInTransaction(tx, signerId, [
    { field_id: 4, value: "would-be-allowed" },
    { field_id: 5, value: "forbidden" },
  ]));
  assert.deepEqual(values, []);
});
