import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { prisma } from "../src/config/prisma";
import { pdfGenerationService } from "../src/modules/signRequests/pdfGeneration.service";
import { signedArtifactWorker } from "../src/modules/signRequests/signedArtifact.worker";
import { signRequestsService } from "../src/modules/signRequests/signRequests.service";
import { storageService } from "../src/core/storage/storage.service";

const originalTransaction = prisma.$transaction;
const originalFindSignRequest = prisma.sign_requests.findUnique;
const originalGenerateSignedPdf = pdfGenerationService.generateSignedPdf;
const originalStorageGet = storageService.get;

afterEach(() => {
  (prisma as unknown as { $transaction: unknown }).$transaction = originalTransaction;
  (prisma.sign_requests as unknown as { findUnique: unknown }).findUnique = originalFindSignRequest;
  (pdfGenerationService as unknown as { generateSignedPdf: unknown }).generateSignedPdf = originalGenerateSignedPdf;
  (storageService as unknown as { get: unknown }).get = originalStorageGet;
});

function installArtifactTransactionHarness(initialStatus: string, transitions: string[]) {
  let status = initialStatus;
  const tx = {
    documents: {
      findUnique: async () => ({ status }),
      update: async ({ data }: { data: { status: string } }) => { status = data.status; transitions.push(`document:${status}`); },
    },
    sign_requests: {
      findUnique: async () => ({ document_id: 30, status, document: { status, signed_file_path: null, hash: null } }),
      update: async ({ data }: { data: { status: string } }) => { status = data.status; transitions.push(`request:${status}`); },
    },
    audit_logs: { create: async ({ data }: { data: { event: string } }) => { transitions.push(data.event); } },
    outbox_events: { create: async () => undefined },
  };
  (prisma as unknown as { $transaction: unknown }).$transaction = async (operation: unknown) =>
    (operation as (client: typeof tx) => unknown)(tx);
}

test("a missing Unicode font marks the artifact failed without completing the document", async () => {
  const transitions: string[] = [];
  installArtifactTransactionHarness("generating_artifact", transitions);
  (prisma.sign_requests as unknown as { findUnique: unknown }).findUnique = async () => ({
    document_id: 30,
    status: "generating_artifact",
    document: { id: 30, status: "generating_artifact", signed_file_path: null, hash: null },
  });
  (pdfGenerationService as unknown as { generateSignedPdf: unknown }).generateSignedPdf = async () => {
    throw new Error("Unicode PDF font is unavailable: configured path");
  };

  await assert.rejects(signedArtifactWorker.processSignedArtifactEvent({ payload: { sign_request_id: 20 } }));
  assert.deepEqual(transitions, ["document:artifact_failed", "request:artifact_failed", "artifact.generation_failed"]);
  assert.equal(transitions.some((entry) => entry.includes("completed")), false);
});

test("worker success persists one readable, hashed artifact and duplicate processing is a no-op", async () => {
  const transitions: string[] = [];
  installArtifactTransactionHarness("generating_artifact", transitions);
  let generationCalls = 0;
  (prisma.sign_requests as unknown as { findUnique: unknown }).findUnique = async () => ({
    document_id: 30,
    status: "generating_artifact",
    document: { id: 30, status: "generating_artifact", signed_file_path: null, hash: null },
  });
  (pdfGenerationService as unknown as { generateSignedPdf: unknown }).generateSignedPdf = async () => { generationCalls += 1; return "storage/1/signed_30.pdf"; };
  (storageService as unknown as { get: unknown }).get = async () => Buffer.from("signed-pdf");

  await signedArtifactWorker.processSignedArtifactEvent({ payload: { sign_request_id: 20 } });
  assert.deepEqual(transitions, ["document:completed", "request:completed", "artifact.generation_succeeded"]);
  assert.equal(generationCalls, 1);
});

test("retry action only requeues a failed artifact", async () => {
  const transitions: string[] = [];
  installArtifactTransactionHarness("artifact_failed", transitions);
  const command = signRequestsService as unknown as {
    ensureCanManageSignRequest(signRequestId: number, tenantId: number, userId: number): Promise<unknown>;
    retrySignedArtifactGeneration(signRequestId: number, tenantId: number, userId: number): Promise<unknown>;
  };
  command.ensureCanManageSignRequest = async () => ({ document_id: 30, status: "artifact_failed" });
  const result = await command.retrySignedArtifactGeneration(20, 1, 2);
  assert.deepEqual(result, { status: "generating_artifact" });
  assert.deepEqual(transitions.slice(0, 2), ["document:generating_artifact", "request:generating_artifact"]);
});
