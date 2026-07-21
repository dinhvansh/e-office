import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { auditService } from "../audit/audit.service";
import { authorizationService } from "../authorization/authorization.service";
import { emailService } from "../common/email.service";
import { signersRepository } from "./signers.repository";
import { pdfGenerationService } from "../signRequests/pdfGeneration.service";
import { notificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notifications.types";
import { assertPublicSigningActionable } from "../public/publicSigningLifecycle.policy";
import { workflowStateService } from "../workflows/workflowState.service";

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 30;

class SignersService {
  async notifyNextPendingSigner(signRequestId: number, tenantId: number): Promise<void> {
    const nextSigner = await prisma.signers.findFirst({
      where: { sign_request_id: signRequestId, status: "pending" },
      orderBy: { signing_order: "asc" },
    });
    if (!nextSigner) return;

    if (nextSigner.is_internal && nextSigner.user_id) {
      await notificationsService.createNotification({
        tenantId,
        userId: nextSigner.user_id,
        type: NotificationType.SIGN_REQUEST,
        title: "Your signing turn",
        message: "A document is waiting for your signature.",
        link: `/sign-requests/${signRequestId}/internal-sign`,
      });
      return;
    }

    if (!nextSigner.is_internal) {
      await this.sendOtp(nextSigner.id, tenantId);
    }
  }

  async addSigner(tenantId: number, userId: number, input: { sign_request_id: number; email: string; name: string; role?: string }): Promise<void> {
    const signRequest = await prisma.sign_requests.findFirst({
      where: { id: input.sign_request_id, tenant_id: tenantId },
    });
    if (!signRequest) {
      throw ApiError.notFound("Sign request not found", "SIGN_REQUEST_NOT_FOUND");
    }
    const decision = await authorizationService.canAccessDocument(
      userId,
      tenantId,
      signRequest.document_id,
      "edit",
    );
    if (!decision.allowed) {
      throw ApiError.forbidden("Permission denied to manage signer", "SIGNER_EDIT_DENIED");
    }
    await signersRepository.create({
      sign_request: { connect: { id: input.sign_request_id } },
      email: input.email,
      name: input.name,
      role: input.role,
      status: "pending",
    });
  }

  async sendOtp(signerId: number, tenantId: number, userId?: number): Promise<{ otp: string; expiresAt: Date; cooldownSeconds: number }> {
    const signer = typeof userId === "number"
      ? await this.ensureCanManageSigner(signerId, tenantId, userId)
      : await signersRepository.findById(signerId);
    if (!signer || signer.sign_request.tenant_id !== tenantId) {
      throw ApiError.notFound("Signer not found", "SIGNER_NOT_FOUND");
    }
    assertPublicSigningActionable(signer);

    const sentAt = signer.otp_sent_at?.getTime() || (signer.otp_expire ? signer.otp_expire.getTime() - OTP_EXPIRY_MINUTES * 60 * 1000 : 0);
    const retryAfterSeconds = Math.ceil((sentAt + OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
    if (retryAfterSeconds > 0) {
      throw ApiError.badRequest("Please wait before requesting another code", "OTP_RESEND_COOLDOWN", { retry_after_seconds: retryAfterSeconds });
    }

    const otp = this.generateOtp();
    const hashed = await bcrypt.hash(otp, 10);
    const now = new Date();
    const otpExpire = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const claimed = await prisma.signers.updateMany({
      where: {
        id: signerId,
        status: { in: ["pending", "otp_sent"] },
        OR: [{ otp_sent_at: null }, { otp_sent_at: { lte: new Date(now.getTime() - OTP_RESEND_COOLDOWN_SECONDS * 1000) } }],
      },
      data: { otp: hashed, otp_expire: otpExpire, otp_sent_at: now, otp_verified_at: null, otp_attempt_count: 0, status: "otp_sent" },
    });
    if (claimed.count !== 1) {
      throw ApiError.badRequest("Please wait before requesting another code", "OTP_RESEND_COOLDOWN", { retry_after_seconds: OTP_RESEND_COOLDOWN_SECONDS });
    }

    try {
      await emailService.sendOtpEmail({
        tenantId,
        recipientEmail: signer.email ?? "",
        recipientName: signer.name ?? "User",
        otp,
        documentTitle: signer.sign_request.title ?? undefined,
        expiryMinutes: OTP_EXPIRY_MINUTES,
      });
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      await prisma.signers.updateMany({
        where: { id: signerId, otp: hashed },
        data: { otp: null, otp_expire: null, otp_sent_at: null, otp_verified_at: null, otp_attempt_count: 0, status: signer.status },
      });
      throw ApiError.internal("OTP delivery is temporarily unavailable", "OTP_DELIVERY_UNAVAILABLE");
    }

    return { otp, expiresAt: otpExpire, cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS };
  }

  async submitSignature(
    signerId: number,
    tenantId: number,
    userId: number,
    input: { otp: string; signature_data?: Record<string, unknown> },
  ): Promise<void> {
    const signer = await signersRepository.findById(signerId);
    if (!signer || signer.sign_request.tenant_id !== tenantId) {
      throw ApiError.notFound("Signer not found", "SIGNER_NOT_FOUND");
    }
    if (signer.is_internal) {
      const currentUser = await prisma.users.findFirst({
        where: { id: userId, tenant_id: tenantId },
        select: { id: true, email: true },
      });
      const matchesCurrentUser =
        !!currentUser &&
        (signer.user_id === currentUser.id ||
          (!!currentUser.email && signer.email?.toLowerCase() === currentUser.email.toLowerCase()));
      if (!matchesCurrentUser) {
        throw ApiError.forbidden("You are not allowed to sign for this signer", "SIGNER_ACCESS_DENIED");
      }
    }
    if (!signer.otp || !signer.otp_expire) {
      throw ApiError.badRequest("OTP not issued", "OTP_NOT_ISSUED");
    }
    if (signer.otp_expire < new Date()) {
      throw ApiError.badRequest("OTP expired", "OTP_EXPIRED");
    }
    const isValidOtp = await bcrypt.compare(input.otp, signer.otp);
    if (!isValidOtp) {
      throw ApiError.badRequest("Invalid OTP", "OTP_INVALID");
    }
    await signersRepository.update(signerId, {
      status: "completed",
      signed_at: new Date(),
      otp: null,
      otp_expire: null,
      otp_sent_at: null,
      otp_verified_at: null,
      otp_attempt_count: 0,
      position_data: input.signature_data ? (input.signature_data as Prisma.InputJsonValue) : undefined,
    });
    await this.updateSignRequestStatus(signer.sign_request_id);
    
    // A progressive PDF is only a preview while other signers are pending.
    // The completed artifact is generated once by signedArtifact.worker, which
    // is the sole producer of the watermark and completion certificate.
    try {
      const [completed, total] = await Promise.all([
        signersRepository.countCompleted(signer.sign_request_id),
        signersRepository.countTotal(signer.sign_request_id),
      ]);
      const allSigned = total > 0 && completed === total;
      
      console.log(`[Signers Service] Generating progressive PDF for sign request ${signer.sign_request_id}`);
      console.log(`[Signers Service] Progress: ${completed}/${total} signed, All signed: ${allSigned}`);
      
      if (!allSigned) {
        const pdfPath = await pdfGenerationService.generateProgressivePdf(signer.sign_request_id);
        await prisma.documents.update({
          where: { id: signer.sign_request.document_id },
          data: { signed_file_path: pdfPath }
        });
        console.log(`[Signers Service] Progressive PDF generated: ${pdfPath}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Signers Service] Failed to generate progressive PDF: ${message}`);
      // Don't throw - signing was successful, PDF generation is secondary
    }
    
    await auditService.record({
      tenantId,
      documentId: signer.sign_request.document_id,
      event: "sign.completed",
    });
    await prisma.outbox_events.create({
      data: {
        tenant_id: tenantId,
        aggregate_type: "signer",
        aggregate_id: String(signer.id),
        event_type: "SIGN_COMPLETED",
        payload: { sign_request_id: signer.sign_request_id, signer_id: signer.id },
        deduplication_key: `sign-completed:${signer.id}`,
      },
    });
  }

  private async updateSignRequestStatus(signRequestId: number): Promise<void> {
    const [completed, total, signRequest] = await Promise.all([
      signersRepository.countCompleted(signRequestId),
      signersRepository.countTotal(signRequestId),
      prisma.sign_requests.findUnique({ where: { id: signRequestId } }),
    ]);
    if (!signRequest) {
      return;
    }
    if (total > 0 && completed === total) {
      await prisma.$transaction(async (tx) => {
        await workflowStateService.transitionSigningPair(tx, {
          documentId: signRequest.document_id,
          signRequestId,
          documentStatus: "generating_artifact",
          signRequestStatus: "generating_artifact",
        });
        await tx.outbox_events.createMany({ data: [{
          tenant_id: signRequest.tenant_id,
          aggregate_type: "sign_request",
          aggregate_id: String(signRequestId),
          event_type: "SIGNED_ARTIFACT_REQUESTED",
          payload: { sign_request_id: signRequestId, document_id: signRequest.document_id },
          deduplication_key: `signed-artifact:${signRequestId}`,
        }], skipDuplicates: true });
      });
    } else {
      await prisma.sign_requests.update({ where: { id: signRequestId }, data: { status: "in_progress" } });
    }
  }

  private generateOtp(): string {
    return (Math.floor(100000 + Math.random() * 900000)).toString();
  }

  async ensureCanManageSigner(signerId: number, tenantId: number, userId: number) {
    const signer = await signersRepository.findById(signerId);
    if (!signer || signer.sign_request.tenant_id !== tenantId) {
      throw ApiError.notFound("Signer not found", "SIGNER_NOT_FOUND");
    }

    const decision = await authorizationService.canAccessDocument(
      userId,
      tenantId,
      signer.sign_request.document_id,
      "edit",
    );
    if (!decision.allowed) {
      throw ApiError.forbidden("Permission denied to manage signer", "SIGNER_EDIT_DENIED");
    }

    return signer;
  }
}

export const signersService = new SignersService();
