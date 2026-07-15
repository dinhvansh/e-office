import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { signingProgressService } from "./signingProgress.service";
import { findNextWaitingSigningOrder } from "./signingOrder.policy";
import { workflowStateService } from "../workflows/workflowState.service";

interface PersistInternalSignatureInput {
  signRequestId: number;
  tenantId: number;
  userId: number;
  signer: { id: number; signing_order: number | null };
  signRequest: { document_id: number; workflow_type: string };
  completionConfig: { completionMode: "all" | "any_one" | "min_n"; minRequired: number } | null;
  signatureData: string | Record<string, string>;
  finalSignatureData: string;
  signatureType: string;
  ipAddress: string;
  userAgent: string;
}

class InternalSigningCommandService {
  async persistSignature(input: PersistInternalSignatureInput) {
    const { signRequestId, tenantId, userId, signer, signRequest, completionConfig, signatureData, finalSignatureData, signatureType, ipAddress, userAgent } = input;
    await prisma.$transaction(async (tx) => {
      const signed = await tx.signers.updateMany({
        where: { id: signer.id, sign_request_id: signRequestId, status: "pending" },
        data: { status: "signed", signed_at: new Date(), signature_data: finalSignatureData, signature_type: signatureType, ip_address: ipAddress, user_agent: userAgent, ...(typeof signatureData === "object" ? { position_data: signatureData as Prisma.InputJsonValue } : {}) },
      });
      if (signed.count !== 1) throw ApiError.conflict("Signer is no longer active", "CONCURRENT_MODIFICATION");

      let transactionSigners = await tx.signers.findMany({ where: { sign_request_id: signRequestId } });
      if (signer.signing_order) {
        const currentOrder = transactionSigners.filter((item) => item.signing_order === signer.signing_order);
        const completedCount = currentOrder.filter((item) => signingProgressService.isSignerStatusComplete(item.status)).length;
        const stepComplete = completionConfig?.completionMode === "any_one" ? completedCount >= 1 : completionConfig?.completionMode === "min_n" ? completedCount >= completionConfig.minRequired : currentOrder.every((item) => signingProgressService.isSignerStatusComplete(item.status));
        if (stepComplete && (completionConfig?.completionMode === "any_one" || completionConfig?.completionMode === "min_n")) {
          await tx.signers.updateMany({ where: { sign_request_id: signRequestId, signing_order: signer.signing_order, status: { notIn: ["signed", "completed", "rejected"] } }, data: { status: "completed" } });
          transactionSigners = await tx.signers.findMany({ where: { sign_request_id: signRequestId } });
        }
        if (stepComplete && signRequest.workflow_type === "sequential") {
          const nextOrder = findNextWaitingSigningOrder(transactionSigners);
          if (nextOrder !== null) {
            const activated = await tx.signers.updateMany({ where: { sign_request_id: signRequestId, signing_order: nextOrder, status: "waiting_signing" }, data: { status: "pending" } });
            if (activated.count > 0) await tx.outbox_events.create({ data: { tenant_id: tenantId, aggregate_type: "sign_request", aggregate_id: String(signRequestId), event_type: "SIGNER_ACTIVATED", payload: { sign_request_id: signRequestId, signing_order: nextOrder }, deduplication_key: `signer-activated:${signRequestId}:${nextOrder}` } });
          }
        }
      }
      const allSignedInTransaction = (await tx.signers.findMany({ where: { sign_request_id: signRequestId } })).every((item) => signingProgressService.isSignerStatusComplete(item.status));
      await workflowStateService.transitionSigningPair(tx, { documentId: signRequest.document_id, signRequestId, documentStatus: allSignedInTransaction ? "generating_artifact" : "in_progress", signRequestStatus: allSignedInTransaction ? "generating_artifact" : "in_progress" });
      await tx.audit_logs.create({ data: { document_id: signRequest.document_id, event: "sign.internal_signed", user_id: userId, ip: ipAddress, ua: userAgent } });
      await tx.outbox_events.create({ data: { tenant_id: tenantId, aggregate_type: "sign_request", aggregate_id: String(signRequestId), event_type: "SIGNATURE_SUBMITTED", payload: { sign_request_id: signRequestId, signer_id: signer.id, is_internal: true }, deduplication_key: `signature-submitted:${signRequestId}:${signer.id}` } });
      if (allSignedInTransaction) await tx.outbox_events.create({ data: { tenant_id: tenantId, aggregate_type: "sign_request", aggregate_id: String(signRequestId), event_type: "SIGNED_ARTIFACT_REQUESTED", payload: { sign_request_id: signRequestId, document_id: signRequest.document_id }, deduplication_key: `signed-artifact:${signRequestId}` } });
    });
  }
}

export const internalSigningCommandService = new InternalSigningCommandService();
