import crypto from "node:crypto";
import { prisma } from "../../config/prisma";
import { storageService } from "../../core/storage/storage.service";
import { workflowStateService } from "../workflows/workflowState.service";
import { pdfGenerationService } from "./pdfGeneration.service";

type ArtifactEvent = {
  payload: unknown;
};

function readSignRequestId(payload: unknown): number {
  if (!payload || typeof payload !== "object") throw new Error("Invalid signed artifact event payload");
  const value = (payload as Record<string, unknown>).sign_request_id;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error("Invalid signed artifact event payload");
  }
  return value;
}

async function markArtifactFailed(signRequestId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const signRequest = await tx.sign_requests.findUnique({
      where: { id: signRequestId },
      select: { document_id: true, status: true },
    });
    if (!signRequest || signRequest.status !== "generating_artifact") return;
    await workflowStateService.transitionSigningPair(tx, {
      documentId: signRequest.document_id,
      signRequestId,
      documentStatus: "artifact_failed",
      signRequestStatus: "artifact_failed",
    });
    await tx.audit_logs.create({
      data: { document_id: signRequest.document_id, event: "artifact.generation_failed" },
    });
  });
}

/** Processes one signed-artifact event. PDF and storage I/O deliberately happen outside a DB transaction. */
export async function processSignedArtifactEvent(event: ArtifactEvent): Promise<void> {
  const signRequestId = readSignRequestId(event.payload);
  const signRequest = await prisma.sign_requests.findUnique({
    where: { id: signRequestId },
    include: { document: { select: { id: true, status: true, signed_file_path: true, hash: true } } },
  });
  if (!signRequest) throw new Error("Sign request not found for signed artifact event");

  // A duplicate outbox event must be a no-op once the canonical artifact is committed.
  if (signRequest.status === "completed" && signRequest.document.signed_file_path && signRequest.document.hash) return;

  try {
    if (signRequest.status === "artifact_failed") {
      await prisma.$transaction((tx) => workflowStateService.transitionSigningPair(tx, {
        documentId: signRequest.document_id,
        signRequestId,
        documentStatus: "generating_artifact",
        signRequestStatus: "generating_artifact",
      }));
    }

    const signedFilePath = await pdfGenerationService.generateSignedPdf(signRequestId);
    const artifactBytes = await storageService.get(signedFilePath);
    if (artifactBytes.byteLength === 0) throw new Error("Generated signed artifact is empty");
    const hash = crypto.createHash("sha256").update(artifactBytes).digest("hex");

    await prisma.$transaction(async (tx) => {
      const current = await tx.sign_requests.findUnique({
        where: { id: signRequestId },
        include: { document: { select: { status: true, signed_file_path: true, hash: true } } },
      });
      if (!current) throw new Error("Sign request not found for signed artifact event");
      if (current.status === "completed" && current.document.signed_file_path && current.document.hash) return;
      await workflowStateService.transitionSigningPair(tx, {
        documentId: current.document_id,
        signRequestId,
        documentStatus: "completed",
        signRequestStatus: "completed",
        signedFilePath,
        hash,
        artifactMetadata: {
          storage_key: signedFilePath,
          sha256: hash,
          size_bytes: artifactBytes.byteLength,
          content_type: "application/pdf",
          generated_at: new Date().toISOString(),
        },
      });
      await tx.audit_logs.create({
        data: { document_id: current.document_id, event: "artifact.generation_succeeded" },
      });
    });
  } catch (error) {
    await markArtifactFailed(signRequestId);
    throw error;
  }
}

export const signedArtifactWorker = { processSignedArtifactEvent };
