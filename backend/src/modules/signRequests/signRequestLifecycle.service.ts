import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { documentsRepository } from "../documents/documents.repository";
import { signersRepository } from "../signers/signers.repository";
import { workflowStateService } from "../workflows/workflowState.service";
import { signRequestsRepository } from "./signRequests.repository";
import { workflowCancellationService } from "../workflows/workflowCancellation.service";

class SignRequestLifecycleService {
  async cancel(
    signRequest: { status: string; document_id: number | null },
    id: number,
    tenantId: number,
    userId: number,
    reason?: string,
  ) {
    if (signRequest.status === "completed" || signRequest.status === "cancelled" || signRequest.status === "archived") {
      throw ApiError.badRequest(
        `Cannot cancel sign request with status: ${signRequest.status}`,
        "SIGN_REQUEST_CANCEL_DENIED",
      );
    }

    if (!signRequest.document_id) throw ApiError.badRequest("Document is required", "DOCUMENT_REQUIRED");
    await workflowCancellationService.cancel({ documentId: signRequest.document_id, tenantId, userId, reason });
  }

  async retrySignedArtifactGeneration(
    signRequest: { status: string; document_id: number },
    signRequestId: number,
    tenantId: number,
  ) {
    if (signRequest.status !== "artifact_failed") {
      throw ApiError.badRequest("Signed artifact is not retryable", "ARTIFACT_RETRY_NOT_ALLOWED");
    }

    await prisma.$transaction(async (tx) => {
      await workflowStateService.transitionSigningPair(tx, {
        documentId: signRequest.document_id,
        signRequestId,
        documentStatus: "generating_artifact",
        signRequestStatus: "generating_artifact",
      });
      await tx.outbox_events.create({
        data: {
          tenant_id: tenantId,
          aggregate_type: "sign_request",
          aggregate_id: String(signRequestId),
          event_type: "SIGNED_ARTIFACT_REQUESTED",
          payload: { sign_request_id: signRequestId, retry: true },
          deduplication_key: `signed-artifact-retry:${signRequestId}:${Date.now()}`,
        },
      });
    });

    return { status: "generating_artifact" };
  }

  /**
   * Legacy low-level helper retained for current service contracts. Production
   * delete endpoints use DocumentsService so lifecycle history is checked first.
   */
  async deleteDraft(signRequest: { status: string }, id: number) {
    if (signRequest.status !== "draft") {
      throw ApiError.badRequest("Only draft sign requests can be hard deleted", "SIGN_REQUEST_DELETE_DENIED");
    }
    await prisma.sign_request_fields.deleteMany({ where: { sign_request_id: id } });
    await prisma.signers.deleteMany({ where: { sign_request_id: id } });
    await prisma.sign_requests.delete({ where: { id } });
  }

  async revokeCompleted(
    signRequest: { status: string; document_id: number | null },
    id: number,
    tenantId: number,
  ) {
    if (signRequest.status !== "completed") {
      throw ApiError.badRequest("Chỉ có thể thu hồi văn bản đã hoàn thành", "SIGN_REQUEST_REVOKE_DENIED");
    }

    const signers = await signersRepository.findBySignRequest(id);
    if (signers.some((signer) => !signer.is_internal)) {
      throw ApiError.badRequest("Không thể thu hồi văn bản có người ký bên ngoài", "SIGN_REQUEST_REVOKE_EXTERNAL_DENIED");
    }

    for (const signer of signers) {
      await signersRepository.update(signer.id, {
        status: "pending",
        signed_at: null,
        signature_data: null,
        signature_type: null,
        ip_address: null,
        user_agent: null,
        otp: null,
        otp_expire: null,
        signing_token: null,
      });
    }
    await signRequestsRepository.updateStatus(id, tenantId, "draft");
    if (signRequest.document_id) {
      await documentsRepository.update(signRequest.document_id, { status: "draft" });
    }
  }
}

export const signRequestLifecycleService = new SignRequestLifecycleService();
