import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { ApiError } from "../src/core/errors/api-error";
import { prisma } from "../src/config/prisma";
import { pdfGenerationService } from "../src/modules/signRequests/pdfGeneration.service";
import { signRequestsService } from "../src/modules/signRequests/signRequests.service";
import { PublicSigningCommandService } from "../src/modules/public/publicSigningCommand.service";

type Transition = { documentStatus?: string; signRequestStatus?: string; event?: string };

const originalTransaction = prisma.$transaction;
const originalGenerateSignedPdf = pdfGenerationService.generateSignedPdf;
const originalConsoleError = console.error;

const replaceTransaction = (value: unknown) => {
  (prisma as unknown as { $transaction: unknown }).$transaction = value;
};

const replaceGenerateSignedPdf = (value: unknown) => {
  (pdfGenerationService as unknown as { generateSignedPdf: unknown }).generateSignedPdf = value;
};

afterEach(() => {
  replaceTransaction(originalTransaction);
  replaceGenerateSignedPdf(originalGenerateSignedPdf);
  console.error = originalConsoleError;
});

function installTransactionHarness(initialStatus: string, transitions: Transition[]) {
  let documentStatus = initialStatus;
  const tx = {
    documents: {
      findUnique: async () => ({ status: documentStatus }),
      update: async (input: { data: { status: string } }) => {
        documentStatus = input.data.status;
        transitions.push({ documentStatus });
      },
    },
    sign_requests: {
      update: async (input: { data: { status: string } }) => {
        transitions.push({ signRequestStatus: input.data.status });
      },
    },
    audit_logs: {
      create: async (input: { data: { event: string } }) => {
        transitions.push({ event: input.data.event });
      },
    },
    outbox_events: {
      create: async (input: { data: { event_type: string } }) => {
        transitions.push({ event: input.data.event_type });
      },
    },
  };
  replaceTransaction(async (operation: unknown) => (operation as (client: typeof tx) => unknown)(tx));
}

test("PDF generation failure stores artifact_failed and never completed", async () => {
  const transitions: Transition[] = [];
  installTransactionHarness("generating_artifact", transitions);
  replaceGenerateSignedPdf(async () => { throw new Error("injected PDF failure"); });
  console.error = () => undefined;
  const command = new PublicSigningCommandService() as unknown as {
    completeArtifact(signRequestId: number, documentId: number): Promise<void>;
  };

  await assert.rejects(command.completeArtifact(20, 30), (error: unknown) =>
    error instanceof ApiError && error.code === "ARTIFACT_GENERATION_FAILED",
  );
  assert.deepEqual(transitions, [
    { documentStatus: "artifact_failed" },
    { signRequestStatus: "artifact_failed" },
  ]);
  assert.equal(transitions.some((item) => item.documentStatus === "completed" || item.signRequestStatus === "completed"), false);
});

test("an artifact_failed request can enter retry and returns to artifact_failed when retry generation fails", async () => {
  const transitions: Transition[] = [];
  installTransactionHarness("artifact_failed", transitions);
  replaceGenerateSignedPdf(async () => { throw new Error("injected retry PDF failure"); });
  console.error = () => undefined;
  const command = signRequestsService as unknown as {
    ensureCanManageSignRequest(signRequestId: number, tenantId: number, userId: number): Promise<unknown>;
    retrySignedArtifactGeneration(signRequestId: number, tenantId: number, userId: number): Promise<unknown>;
  };
  command.ensureCanManageSignRequest = async () => ({ document_id: 30, status: "artifact_failed" });

  await assert.rejects(command.retrySignedArtifactGeneration(20, 1, 2), (error: unknown) =>
    error instanceof ApiError && error.code === "ARTIFACT_GENERATION_FAILED",
  );
  assert.deepEqual(transitions, [
    { documentStatus: "generating_artifact" },
    { signRequestStatus: "generating_artifact" },
    { event: "SIGNED_ARTIFACT_REQUESTED" },
    { documentStatus: "artifact_failed" },
    { signRequestStatus: "artifact_failed" },
    { event: "artifact.retry_failed" },
  ]);
});
