import assert from "node:assert/strict";
import test from "node:test";
import type { documents } from "@prisma/client";
import { prisma } from "../src/config/prisma";
import { ApiError } from "../src/core/errors/api-error";
import { DocumentLifecycleService } from "../src/modules/documents/documentLifecycle.service";
import { WorkflowCancellationService } from "../src/modules/workflows/workflowCancellation.service";

test("archive and cancellation expose stable denial codes for invalid terminal states", async () => {
  const lifecycle = new DocumentLifecycleService(prisma);
  await assert.rejects(
    lifecycle.archive({ id: 1, status: "draft" } as documents),
    (error: unknown) => error instanceof ApiError && error.code === "DOCUMENT_ARCHIVE_DENIED_STATUS",
  );
  const database = {
    documents: { findFirst: async () => ({ id: 1, status: "completed", sign_request_id: null }) },
    $transaction: async () => { throw new Error("transaction must not start"); },
  } as unknown as typeof prisma;
  await assert.rejects(
    new WorkflowCancellationService(database).cancel({ documentId: 1, tenantId: 1, userId: 1 }),
    (error: unknown) => error instanceof ApiError && error.code === "DOCUMENT_CANCEL_DENIED",
  );
});

test("active request must cancel before archive and revoked signer credentials stay invalid", async () => {
  const state = {
    document: { id: 10, tenant_id: 2, sign_request_id: 20, status: "in_progress" },
    request: { id: 20, document_id: 10, status: "in_progress" },
    signer: { id: 30, status: "otp_sent", otp: "123456" as string | null, otp_expire: new Date() as Date | null, signing_token: "old-token" as string | null },
    runs: [{ id: 40, status: "completed" }, { id: 41, status: "in_progress" }],
    auditEvents: [] as string[],
  };

  const tx = {
    documents: {
      update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(state.document, data),
    },
    sign_requests: {
      findMany: async () => [{ id: state.request.id, status: state.request.status }],
      update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(state.request, data),
      updateMany: async ({ data }: { data: Record<string, unknown> }) => { Object.assign(state.request, data); return { count: 1 }; },
    },
    signers: {
      updateMany: async ({ data }: { data: Record<string, unknown> }) => { Object.assign(state.signer, data); return { count: 1 }; },
    },
    workflow_instances: {
      findMany: async () => state.runs.filter((run) => run.status === "in_progress").map(({ id }) => ({ id })),
      count: async () => state.runs.filter((run) => run.status === "in_progress").length,
      updateMany: async ({ where, data }: { where: { id: { in: number[] } }; data: Record<string, unknown> }) => {
        state.runs.filter((run) => where.id.in.includes(run.id)).forEach((run) => Object.assign(run, data));
        return { count: where.id.in.length };
      },
    },
    audit_logs: {
      create: async ({ data }: { data: { event: string } }) => { state.auditEvents.push(data.event); return data; },
    },
  };
  const database = {
    documents: { findFirst: async () => ({ ...state.document }) },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as typeof prisma;

  const cancellation = new WorkflowCancellationService(database);
  const lifecycle = new DocumentLifecycleService(database);

  await assert.rejects(
    lifecycle.archive(state.document as unknown as documents, 7),
    (error: unknown) => error instanceof ApiError && error.code === "DOCUMENT_ARCHIVE_DENIED_STATUS",
  );
  await cancellation.cancel({ documentId: 10, tenantId: 2, userId: 7, reason: "Archive requested" });
  await lifecycle.archive(state.document as unknown as documents, 7);

  assert.equal(state.document.status, "archived");
  assert.equal(state.request.status, "archived");
  assert.equal(state.runs[0].status, "completed");
  assert.equal(state.runs[1].status, "cancelled");
  assert.deepEqual(
    { status: state.signer.status, otp: state.signer.otp, otp_expire: state.signer.otp_expire, signing_token: state.signer.signing_token },
    { status: "cancelled", otp: null, otp_expire: null, signing_token: null },
  );
  assert.deepEqual(state.auditEvents, ["document.cancelled", "DOCUMENT_ARCHIVED"]);
});
