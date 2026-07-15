import { documents } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { canCancelDocumentStatus } from "./documentLifecycle.policy";
import { workflowStateService } from "../workflows/workflowState.service";

class DocumentLifecycleService {
  async archive(document: documents): Promise<void> {
    if (document.status !== "completed") {
      throw ApiError.badRequest("Only completed documents can be archived", "DOCUMENT_NOT_COMPLETED");
    }
    await prisma.documents.update({ where: { id: document.id }, data: { status: "archived" } });
  }

  async cancel(document: documents, userId: number): Promise<void> {
    if (!canCancelDocumentStatus(document.status)) {
      throw ApiError.badRequest("Only active workflow documents can be cancelled", "DOCUMENT_CANCEL_DENIED");
    }
    await prisma.$transaction(async (tx) => {
      if (document.sign_request_id) {
        await workflowStateService.transitionSigningPair(tx, { documentId: document.id, signRequestId: document.sign_request_id, documentStatus: "cancelled", signRequestStatus: "cancelled" });
        await tx.signers.updateMany({ where: { sign_request_id: document.sign_request_id, status: { in: ["pending", "waiting_approval", "waiting_signing", "otp_sent"] } }, data: { status: "cancelled" } });
      } else {
        await workflowStateService.transitionDocument(tx, { documentId: document.id, status: "cancelled" });
      }
      await tx.workflow_instances.updateMany({ where: { document_id: document.id, status: { notIn: ["completed", "cancelled"] } }, data: { status: "cancelled", completed_at: new Date() } });
      await tx.audit_logs.create({ data: { document_id: document.id, event: "document.cancelled", user_id: userId, ip: null, ua: null } });
    });
  }
}

export const documentLifecycleService = new DocumentLifecycleService();
