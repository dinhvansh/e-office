import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { auditService } from "../audit/audit.service";
import { emailService } from "../common/email.service";
import { webhookService } from "../webhooks/webhooks.service";
import { signersRepository } from "./signers.repository";
import { pdfGenerationService } from "../signRequests/pdfGeneration.service";

const OTP_EXPIRY_MINUTES = 10;

class SignersService {
  async addSigner(tenantId: number, input: { sign_request_id: number; email: string; name: string; role?: string }): Promise<void> {
    const signRequest = await prisma.sign_requests.findFirst({
      where: { id: input.sign_request_id, tenant_id: tenantId },
    });
    if (!signRequest) {
      throw ApiError.notFound("Sign request not found", "SIGN_REQUEST_NOT_FOUND");
    }
    await signersRepository.create({
      sign_request: { connect: { id: input.sign_request_id } },
      email: input.email,
      name: input.name,
      role: input.role,
      status: "pending",
    });
  }

  async sendOtp(signerId: number, tenantId: number): Promise<string> {
    const signer = await signersRepository.findById(signerId);
    if (!signer || signer.sign_request.tenant_id !== tenantId) {
      throw ApiError.notFound("Signer not found", "SIGNER_NOT_FOUND");
    }
    const otp = this.generateOtp();
    const hashed = await bcrypt.hash(otp, 10);
    await signersRepository.update(signerId, {
      otp: hashed,
      otp_expire: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      status: "otp_sent",
    });

    // Send OTP via email
    try {
      await emailService.sendOtpEmail({
        recipientEmail: signer.email ?? "",
        recipientName: signer.name ?? "User",
        otp,
        documentTitle: signer.sign_request.title ?? undefined,
        expiryMinutes: OTP_EXPIRY_MINUTES,
      });
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      // Don't fail the request if email fails, just log it
    }

    return otp;
  }

  async submitSignature(
    signerId: number,
    tenantId: number,
    input: { otp: string; signature_data?: Record<string, unknown> },
  ): Promise<void> {
    const signer = await signersRepository.findById(signerId);
    if (!signer || signer.sign_request.tenant_id !== tenantId) {
      throw ApiError.notFound("Signer not found", "SIGNER_NOT_FOUND");
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
      position_data: input.signature_data ? (input.signature_data as Prisma.InputJsonValue) : undefined,
    });
    await this.updateSignRequestStatus(signer.sign_request_id);
    
    // Generate progressive PDF after each signature
    try {
      const [completed, total] = await Promise.all([
        signersRepository.countCompleted(signer.sign_request_id),
        signersRepository.countTotal(signer.sign_request_id),
      ]);
      const allSigned = total > 0 && completed === total;
      
      console.log(`[Signers Service] Generating progressive PDF for sign request ${signer.sign_request_id}`);
      console.log(`[Signers Service] Progress: ${completed}/${total} signed, All signed: ${allSigned}`);
      
      const pdfPath = await pdfGenerationService.generateProgressivePdf(
        signer.sign_request_id,
        {
          includeAuditTrail: allSigned,
          addWatermark: !allSigned
        }
      );
      
      // Update document with signed file path
      await prisma.documents.update({
        where: { id: signer.sign_request.document_id },
        data: { signed_file_path: pdfPath }
      });
      
      console.log(`[Signers Service] Progressive PDF generated: ${pdfPath}`);
    } catch (error: any) {
      console.error(`[Signers Service] Failed to generate progressive PDF: ${error.message}`);
      // Don't throw - signing was successful, PDF generation is secondary
    }
    
    await auditService.record({
      tenantId,
      documentId: signer.sign_request.document_id,
      event: "sign.completed",
    });
    await webhookService.emit(tenantId, "sign.completed", {
      sign_request_id: signer.sign_request_id,
      signer_id: signer.id,
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
      await prisma.sign_requests.update({ where: { id: signRequestId }, data: { status: "completed" } });
      await prisma.documents.update({
        where: { id: signRequest.document_id },
        data: { status: "completed" },
      });
    } else {
      await prisma.sign_requests.update({ where: { id: signRequestId }, data: { status: "in_progress" } });
    }
  }

  private generateOtp(): string {
    return (Math.floor(100000 + Math.random() * 900000)).toString();
  }
}

export const signersService = new SignersService();
