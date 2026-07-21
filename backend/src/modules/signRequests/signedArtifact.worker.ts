import crypto from "node:crypto";
import path from "node:path";
import { prisma } from "../../config/prisma";
import { storageService } from "../../core/storage/storage.service";
import { readStoredFile } from "../../core/storage/fileStorage";
import { workflowStateService } from "../workflows/workflowState.service";
import { outboxDeliveryService } from "../outbox/outboxDelivery.service";
import { pdfGenerationService } from "./pdfGeneration.service";
import { documentFileService } from "../documents/documentFile.service";
import { completionCertificateService } from "../documents/completionCertificate.service";

type ArtifactEvent = {
  payload: unknown;
};

function readArtifactTarget(payload: unknown): { signRequestId?: number; documentId?: number; force: boolean } {
  if (!payload || typeof payload !== "object") throw new Error("Invalid signed artifact event payload");
  const record = payload as Record<string, unknown>;
  const signRequestId = record.sign_request_id;
  const documentId = record.document_id;
  const force = record.force === true;
  if (typeof signRequestId === "number" && Number.isInteger(signRequestId) && signRequestId > 0) return { signRequestId, force };
  if (typeof documentId === "number" && Number.isInteger(documentId) && documentId > 0) return { documentId, force };
  {
    throw new Error("Invalid signed artifact event payload");
  }
}

async function processDocumentOnlyArtifact(documentId: number): Promise<void> {
  const document = await prisma.documents.findUnique({ where: { id: documentId } });
  if (!document) throw new Error("Document not found for final artifact event");
  if (document.status === "completed" && document.signed_file_path && document.hash) return;
  try {
    const sourceBytes = await readStoredFile(storageService, document.file_path);
    const watermarked = await documentFileService.getWatermarkedBufferIfNeeded({ fileBytes: sourceBytes, mimeType: "application/pdf", documentStatus: "completed", tenantId: document.tenant_id });
    const certificate = await completionCertificateService.appendApprovalCertificate({ documentId, tenantId: document.tenant_id, fileBytes: watermarked || sourceBytes });
    const finalBytes = certificate.fileBytes;
    const storageKey = path.posix.join("storage", String(document.tenant_id), `final_${Date.now()}_${document.id}.pdf`);
    await storageService.put({ key: storageKey, body: finalBytes, contentType: "application/pdf" });
    const hash = crypto.createHash("sha256").update(finalBytes).digest("hex");
    await prisma.$transaction(async (tx) => {
      await workflowStateService.transitionDocument(tx, { documentId, status: "completed", signedFilePath: storageKey, hash, artifactMetadata: { storage_key: storageKey, sha256: hash, size_bytes: finalBytes.byteLength, content_type: "application/pdf", watermark_applied: Boolean(watermarked), certificate_applied: certificate.applied, generated_at: new Date().toISOString() } });
      await tx.audit_logs.create({ data: { document_id: documentId, event: "artifact.generation_succeeded" } });
    });
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.documents.findUnique({ where: { id: documentId }, select: { status: true } });
      if (current?.status === "generating_artifact") {
        await workflowStateService.transitionDocument(tx, { documentId, status: "artifact_failed" });
        await tx.audit_logs.create({ data: { document_id: documentId, event: "artifact.generation_failed" } });
      }
    });
    throw error;
  }
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
  const target = readArtifactTarget(event.payload);
  if (!target.signRequestId) return processDocumentOnlyArtifact(target.documentId!);
  const signRequestId = target.signRequestId;
  const signRequest = await prisma.sign_requests.findUnique({
    where: { id: signRequestId },
    include: { document: { select: { id: true, tenant_id: true, status: true, signed_file_path: true, hash: true } } },
  });
  if (!signRequest) throw new Error("Sign request not found for signed artifact event");

  // A duplicate outbox event must be a no-op once the canonical artifact is committed.
  if (!target.force && signRequest.status === "completed" && signRequest.document.signed_file_path && signRequest.document.hash) return;

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
    const stagedBytes = await readStoredFile(storageService, signedFilePath);
    if (stagedBytes.byteLength === 0) throw new Error("Generated signed artifact is empty");
    const watermarkedBytes = await documentFileService.getWatermarkedBufferIfNeeded({
      fileBytes: stagedBytes,
      mimeType: "application/pdf",
      documentStatus: "completed",
      tenantId: signRequest.document.tenant_id,
    });
    const certificate = await completionCertificateService.appendApprovalCertificate({
      documentId: signRequest.document.id,
      tenantId: signRequest.document.tenant_id,
      fileBytes: watermarkedBytes || stagedBytes,
    });
    const artifactBytes = certificate.fileBytes;
    await storageService.put({ key: signedFilePath, body: artifactBytes, contentType: "application/pdf" });
    const hash = crypto.createHash("sha256").update(artifactBytes).digest("hex");

    await prisma.$transaction(async (tx) => {
      const current = await tx.sign_requests.findUnique({
        where: { id: signRequestId },
        include: {
          document: { select: { status: true, signed_file_path: true, hash: true, title: true, document_number: true } },
          signers: {
            select: { id: true, name: true, email: true, signing_token: true, is_internal: true, status: true },
          },
        },
      });
      if (!current) throw new Error("Sign request not found for signed artifact event");
      if (!target.force && current.status === "completed" && current.document.signed_file_path && current.document.hash) return;
      const artifactMetadata = {
        storage_key: signedFilePath,
        sha256: hash,
        size_bytes: artifactBytes.byteLength,
        content_type: "application/pdf",
        watermark_applied: Boolean(watermarkedBytes),
        certificate_applied: certificate.applied,
        generated_at: new Date().toISOString(),
      };
      if (target.force && current.status === "completed") {
        await tx.documents.update({ where: { id: current.document_id }, data: { signed_file_path: signedFilePath, hash, artifact_metadata: artifactMetadata } });
      } else {
        await workflowStateService.transitionSigningPair(tx, {
          documentId: current.document_id,
          signRequestId,
          documentStatus: "completed",
          signRequestStatus: "completed",
          signedFilePath,
          hash,
          artifactMetadata,
        });
      }
      await tx.audit_logs.create({
        data: { document_id: current.document_id, event: "artifact.generation_succeeded" },
      });

      const frontendUrl = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
      for (const signer of current.signers) {
        if (signer.is_internal || !signer.email || !signer.signing_token) continue;
        if (!['signed', 'completed'].includes(signer.status || '')) continue;
        await outboxDeliveryService.enqueueEmail(tx, {
          tenantId: current.tenant_id,
          aggregateType: "signer",
          aggregateId: signer.id,
          template: "sign_completed",
          data: {
            tenantId: current.tenant_id,
            recipientEmail: signer.email,
            recipientName: signer.name || signer.email,
            documentTitle: current.title || current.document.title || "Tài liệu",
            documentNumber: current.document.document_number || undefined,
            signerName: signer.name || signer.email,
            documentUrl: `${frontendUrl}/sign/${signer.signing_token}`,
          },
          deduplicationKey: `signed-artifact-ready:${current.id}:external-signer:${signer.id}`,
        });
      }
    });
  } catch (error) {
    await markArtifactFailed(signRequestId);
    throw error;
  }
}

export const signedArtifactWorker = { processSignedArtifactEvent };
