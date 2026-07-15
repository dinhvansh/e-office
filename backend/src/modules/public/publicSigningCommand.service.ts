import bcrypt from "bcryptjs";
import { ApiError } from "../../core/errors/api-error";
import { prisma } from "../../config/prisma";
import { outboxDeliveryService } from "../outbox/outboxDelivery.service";
import { notificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notifications.types";
import {
  FieldValueInput,
  signRequestFieldValuesService,
} from "../signRequests/signRequestFieldValues.service";
import { canSignerActInOrder, findNextWaitingSigningOrder } from "../signRequests/signingOrder.policy";
import { signersService } from "../signers/signers.service";
import { workflowStateService } from "../workflows/workflowState.service";
import { isSigningSessionValid } from "./signingSession.service";

export interface PublicSigningCommandInput {
  invitationToken: string;
  signingSession?: string;
  otp: string;
  signatureData?: string;
  signatureType?: "drawn" | "uploaded" | "typed" | "certificate";
  fieldValues: FieldValueInput[];
  ipAddress?: string;
  userAgent?: string;
}

export class PublicSigningCommandService {
  async submit(input: PublicSigningCommandInput): Promise<{ allSigned: boolean }> {
    const signer = await prisma.signers.findUnique({
      where: { signing_token: input.invitationToken },
      include: { sign_request: true },
    });
    if (!signer) {
      throw ApiError.notFound("Invalid signing link");
    }
    if (!isSigningSessionValid(input.signingSession, signer.id, signer.sign_request_id, signer.otp)) {
      throw ApiError.unauthorized("OTP verification is required", "SIGNING_SESSION_INVALID");
    }
    if (["signed", "completed", "cancelled", "rejected", "expired"].includes(signer.status || "")) {
      throw ApiError.badRequest("You have already signed this document");
    }

    if (signer.sign_request.workflow_type === "sequential") {
      const allSigners = await prisma.signers.findMany({
        where: { sign_request_id: signer.sign_request_id },
        orderBy: { signing_order: "asc" },
      });
      if (!canSignerActInOrder(signer.sign_request.workflow_type, signer.signing_order, allSigners)) {
        const pending = allSigners
          .filter((item) => item.signing_order !== null && signer.signing_order !== null && item.signing_order < signer.signing_order)
          .filter((item) => item.status !== "completed" && item.status !== "signed")
          .map((item) => item.name || item.email)
          .join(", ");
        throw ApiError.conflict(`Please wait for previous signer(s): ${pending}`, "SIGNING_ORDER_VIOLATION");
      }
    }

    if (!signer.otp || !signer.otp_expire) {
      throw ApiError.badRequest("OTP not issued");
    }
    if (signer.otp_expire < new Date()) {
      throw ApiError.badRequest("OTP expired");
    }
    if (!(await bcrypt.compare(input.otp, signer.otp))) {
      throw ApiError.badRequest("Invalid OTP");
    }

    const signingCommand = await prisma.$transaction(async (tx) => {
      if (input.fieldValues.length > 0) {
        await signRequestFieldValuesService.saveFieldValuesInTransaction(tx, signer.id, input.fieldValues);
        if (!(await signRequestFieldValuesService.validateRequiredFieldsInTransaction(tx, signer.id))) {
          throw ApiError.badRequest("Please fill all required fields");
        }
      }
      const updated = await tx.signers.updateMany({
        where: { id: signer.id, status: { notIn: ["signed", "completed", "rejected", "cancelled"] } },
        data: {
          status: "signed",
          signed_at: new Date(),
          signature_data: input.signatureData,
          signature_type: input.signatureType,
          ip_address: input.ipAddress,
          user_agent: input.userAgent,
          otp: null,
          otp_expire: null,
        },
      });
      if (updated.count !== 1) return { updated, allSigned: false };

      await tx.outbox_events.create({
        data: {
          tenant_id: signer.sign_request.tenant_id,
          aggregate_type: "signer",
          aggregate_id: String(signer.id),
          event_type: "SIGNATURE_SUBMITTED",
          payload: { signer_id: signer.id, sign_request_id: signer.sign_request_id },
          deduplication_key: `signature-submitted:${signer.id}`,
        },
      });

      const currentSigners = await tx.signers.findMany({
        where: { sign_request_id: signer.sign_request_id },
        orderBy: { signing_order: "asc" },
      });
      const allSigned = currentSigners.every((item) => item.status === "completed" || item.status === "signed");
      await workflowStateService.transitionSigningPair(tx, {
        documentId: signer.sign_request.document_id,
        signRequestId: signer.sign_request_id,
        documentStatus: allSigned ? "generating_artifact" : "in_progress",
        signRequestStatus: allSigned ? "generating_artifact" : "in_progress",
      });
      if (allSigned) {
        await tx.outbox_events.create({
          data: {
            tenant_id: signer.sign_request.tenant_id,
            aggregate_type: "sign_request",
            aggregate_id: String(signer.sign_request_id),
            event_type: "SIGNED_ARTIFACT_REQUESTED",
            payload: { sign_request_id: signer.sign_request_id, document_id: signer.sign_request.document_id },
            deduplication_key: `signed-artifact:${signer.sign_request_id}`,
          },
        });
      }
      if (!allSigned && signer.sign_request.workflow_type === "sequential") {
        const nextOrder = findNextWaitingSigningOrder(currentSigners);
        if (nextOrder !== null) {
          const activated = await tx.signers.updateMany({
            where: { sign_request_id: signer.sign_request_id, signing_order: nextOrder, status: "waiting_signing" },
            data: { status: "pending" },
          });
          if (activated.count > 0) {
            await tx.outbox_events.create({
              data: {
                tenant_id: signer.sign_request.tenant_id,
                aggregate_type: "sign_request",
                aggregate_id: String(signer.sign_request_id),
                event_type: "SIGNER_ACTIVATED",
                payload: { sign_request_id: signer.sign_request_id, signing_order: nextOrder },
                deduplication_key: `signer-activated:${signer.sign_request_id}:${nextOrder}`,
              },
            });
          }
        }
      }
      return { updated, allSigned };
    });
    if (signingCommand.updated.count !== 1) {
      throw ApiError.conflict("Signing request was already processed", "CONCURRENT_MODIFICATION");
    }

    if (!signingCommand.allSigned) {
      await signersService.notifyNextPendingSigner(signer.sign_request_id, signer.sign_request.tenant_id);
    }

    return { allSigned: signingCommand.allSigned };
  }

  private async notifyCompletion(input: {
    invitationToken: string;
    signerEmail: string | null;
    signerName: string | null;
    tenantId: number;
    documentId: number;
    title: string | null;
  }): Promise<void> {
    const document = await prisma.documents.findUnique({ where: { id: input.documentId }, include: { owner: true } });
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    if (document?.owner) {
      notificationsService.createNotification({
        tenantId: document.tenant_id,
        userId: document.owner.id,
        type: NotificationType.SIGN_COMPLETED,
        title: "Ky hoan tat",
        message: `Tai lieu "${document.title || "Untitled"}" da duoc ky hoan tat`,
        link: `/documents/${document.id}`,
      }).catch((error) => console.error("Failed to create notification:", error));
      if (document.owner.email) {
        outboxDeliveryService.enqueueEmail(prisma, {
          tenantId: document.tenant_id,
          aggregateType: "document",
          aggregateId: document.id,
          template: "sign_completed",
          data: {
            tenantId: document.tenant_id,
            recipientEmail: document.owner.email,
            recipientName: document.owner.full_name || document.owner.email,
            documentTitle: document.title || "Untitled",
            documentNumber: document.document_number || undefined,
            signerName: input.signerName || input.signerEmail,
            documentUrl: `${frontendUrl}/documents/${document.id}/flow`,
          },
          deduplicationKey: `sign-completed-owner:${document.id}`,
        });
      }
    }
    if (input.signerEmail) {
      outboxDeliveryService.enqueueEmail(prisma, {
        tenantId: input.tenantId,
        aggregateType: "document",
        aggregateId: input.documentId,
        template: "sign_completed",
        data: {
          tenantId: input.tenantId,
          recipientEmail: input.signerEmail,
          recipientName: input.signerName || input.signerEmail,
          documentTitle: input.title || document?.title || "Untitled",
          documentNumber: document?.document_number || undefined,
          signerName: input.signerName || input.signerEmail,
          documentUrl: `${frontendUrl}/sign/${input.invitationToken}/download-signed`,
        },
        deduplicationKey: `sign-completed-signer:${input.documentId}:${input.signerEmail}`,
      });
    }
  }
}

export const publicSigningCommandService = new PublicSigningCommandService();
