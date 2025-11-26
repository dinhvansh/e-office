import { Prisma, sign_requests } from "@prisma/client";
import * as crypto from "crypto";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { auditService } from "../audit/audit.service";
import { documentsRepository } from "../documents/documents.repository";
import { licenseService } from "../licenses/license.service";
import { signersRepository } from "../signers/signers.repository";
import { webhookService } from "../webhooks/webhooks.service";
import { signRequestsRepository } from "./signRequests.repository";
import { signRequestFieldsService } from "./signRequestFields.service";

export interface SignerInput {
  email: string;
  name: string;
  role?: string;
  position_data?: Record<string, unknown>;
}

export interface CreateSignRequestInput {
  document_id: number;
  title?: string;
  message?: string;
  workflow_type?: string;
  deadline?: Date | null;
  signers: SignerInput[];
}

class SignRequestsService {
  async listSignRequests(tenantId: number) {
    return signRequestsRepository.listByTenant(tenantId);
  }

  /**
   * Get single sign request by ID
   */
  async getSignRequest(id: number, tenantId: number) {
    const signRequest = await signRequestsRepository.findById(id, tenantId);
    if (!signRequest) {
      throw ApiError.notFound("Sign request not found", "SIGN_REQUEST_NOT_FOUND");
    }
    return signRequest;
  }

  /**
   * Get sign requests created by the current user
   */
  async getMySignRequests(userId: number, tenantId: number, status?: string) {
    const where: Prisma.sign_requestsWhereInput = {
      tenant_id: tenantId,
      document: {
        owner_id: userId
      }
    };

    if (status) {
      where.status = status;
    }

    const signRequests = await signRequestsRepository.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            original_file_name: true,
            document_number: true,
            owner: {
              select: { 
                id: true,
                full_name: true, 
                email: true 
              }
            }
          }
        },
        signers: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            signed_at: true,
            signing_order: true
          },
          orderBy: {
            signing_order: 'asc'
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return signRequests;
  }

  /**
   * Create draft sign request (auto-created by system)
   */
  async createDraftSignRequest(data: {
    document_id: number;
    tenant_id: number;
    title?: string;
    auto_created?: boolean;
  }) {
    const signRequestData: Prisma.sign_requestsCreateInput = {
      tenant: { connect: { id: data.tenant_id } },
      document: { connect: { id: data.document_id } },
      title: data.title,
      workflow_type: "sequential",
      status: "draft",
      auto_created: data.auto_created || false,
    };
    
    return await signRequestsRepository.create(signRequestData);
  }

  async createSignRequest(tenantId: number, userId: number, input: CreateSignRequestInput) {
    await licenseService.ensureLicenseForTenant(tenantId);
    const document = await documentsRepository.findById(input.document_id, tenantId);
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    const signRequestData: Prisma.sign_requestsCreateInput = {
      tenant: { connect: { id: tenantId } },
      document: { connect: { id: document.id } },
      title: input.title,
      message: input.message,
      workflow_type: input.workflow_type ?? "sequential",
      status: "draft",
      deadline: input.deadline ?? null,
    };
    const signRequest = await signRequestsRepository.create(signRequestData);

    if (input.signers?.length) {
      // Check which signers are internal users
      const signerEmails = input.signers.map(s => s.email);
      const internalUsers = await prisma.users.findMany({
        where: {
          tenant_id: tenantId,
          email: { in: signerEmails },
          status: 'active'
        },
        select: { id: true, email: true } // ✅ Get user ID
      });
      const internalUserMap = new Map(internalUsers.map(u => [u.email, u.id]));

      await signersRepository.createMany(
        input.signers.map((signer) => ({
          sign_request_id: signRequest.id,
          email: signer.email,
          name: signer.name,
          role: signer.role,
          status: "pending",
          is_internal: internalUserMap.has(signer.email), // ✅ Set based on user existence
          user_id: internalUserMap.get(signer.email) || null, // ✅ Set user_id for internal users
          position_data: signer.position_data ? (signer.position_data as Prisma.InputJsonValue) : undefined,
        })),
      );
    }

    await auditService.record({
      tenantId,
      documentId: document.id,
      event: "sign.started",
      userId,
    });
    await webhookService.emit(tenantId, "sign.started", {
      sign_request_id: signRequest.id,
      document_id: document.id,
    });

    return this.getSignRequest(signRequest.id, tenantId);
  }

  async getSignRequest(id: number, tenantId: number) {
    const signRequest = await signRequestsRepository.findById(id, tenantId);
    if (!signRequest) {
      throw ApiError.notFound("Sign request not found", "SIGN_REQUEST_NOT_FOUND");
    }
    return signRequest;
  }



  async addSigner(
    signRequestId: number,
    tenantId: number,
    signerData: SignerInput & { signing_order?: number }
  ) {
    // Verify sign request exists and belongs to tenant
    const signRequest = await this.getSignRequest(signRequestId, tenantId);

    // Only allow adding signers when status = 'draft'
    if (signRequest.status !== 'draft') {
      throw ApiError.badRequest('Cannot add signers after sign request is sent');
    }

    // Check if signer is internal user
    const internalUser = await prisma.users.findFirst({
      where: {
        tenant_id: tenantId,
        email: signerData.email,
        status: 'active'
      },
      select: { id: true } // ✅ Get user ID
    });

    // Create signer with Prisma relation
    const signerCreateData: Prisma.signersCreateInput = {
      sign_request: { connect: { id: signRequestId } },
      email: signerData.email,
      name: signerData.name,
      role: signerData.role,
      signing_order: signerData.signing_order,
      status: 'pending',
      is_internal: !!internalUser, // ✅ Set based on user existence
      user_id: internalUser?.id || null, // ✅ Set user_id for internal users
      position_data: signerData.position_data as Prisma.InputJsonValue,
    };

    const signer = await signersRepository.create(signerCreateData);

    return signer;
  }

  async sendSignRequest(id: number, tenantId: number, userId: number) {
    const signRequest = await this.getSignRequest(id, tenantId);

    if (signRequest.status !== "draft") {
      throw ApiError.badRequest("Sign request already sent", "SIGN_REQUEST_ALREADY_SENT");
    }

    // Validate fields (if any exist)
    const fieldCount = await signRequestsRepository.countFields(id);
    if (fieldCount > 0) {
      const validation = await signRequestFieldsService.validateFieldsBeforeSend(id);
      if (!validation.valid) {
        throw ApiError.badRequest(validation.message || "Field validation failed");
      }
    }

    // Generate signing tokens for all signers
    const signers = await signersRepository.findBySignRequest(id);
    for (const signer of signers) {
      const token = crypto.randomBytes(32).toString("hex");
      await signersRepository.update(signer.id, { signing_token: token });
    }

    // Update status to pending
    await signRequestsRepository.updateStatus(id, tenantId, "pending");

    // Reload signers with updated tokens
    const signersWithTokens = await signersRepository.findBySignRequest(id);

    // Send email notifications with signing links
    const { emailService } = await import('../common/email.service');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Get sender info
    const sender = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true }
    });
    
    // Generate OTP and send email to each external signer
    for (const signer of signersWithTokens) {
      if (!signer.is_internal && signer.signing_token) {
        const signUrl = `${frontendUrl}/sign/${signer.signing_token}`;
        
        // Generate OTP immediately
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const bcrypt = require('bcrypt');
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Save OTP to database
        await signersRepository.update(signer.id, {
          otp: otpHash,
          otp_expire: otpExpire,
          status: 'otp_sent'
        });
        
        try {
          // Send email with both signing URL and OTP
          await emailService.sendSignRequestWithOTP({
            recipientEmail: signer.email,
            recipientName: signer.name,
            documentTitle: signRequest.title || signRequest.document?.title || 'Document',
            senderName: sender?.full_name || sender?.email || 'System',
            message: signRequest.message,
            signUrl: signUrl,
            otp: otp,
            expiryMinutes: 10
          });
          console.log(`📧 Sign request email (with OTP) sent to: ${signer.email}`);
        } catch (error) {
          console.error(`❌ Failed to send email to ${signer.email}:`, error.message);
        }
      }
    }

    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign.sent",
      userId,
    });

    return this.getSignRequest(id, tenantId);
  }

  /**
   * Cancel sign request and notify all signers
   */
  async cancelSignRequest(id: number, tenantId: number, userId: number, reason?: string) {
    const signRequest = await this.getSignRequest(id, tenantId);

    // Only allow canceling pending or in-progress sign requests
    if (signRequest.status === "completed" || signRequest.status === "cancelled") {
      throw ApiError.badRequest(
        `Cannot cancel sign request with status: ${signRequest.status}`,
        "SIGN_REQUEST_CANCEL_DENIED"
      );
    }

    // Get user info for email
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true }
    });

    // Get all signers to notify
    const signers = await signersRepository.findBySignRequest(id);

    // Update sign request status
    await signRequestsRepository.updateStatus(id, tenantId, "cancelled");

    // Update document status back to draft
    if (signRequest.document_id) {
      await documentsRepository.update(signRequest.document_id, {
        status: "draft",
      });
    }

    // TODO: Send cancellation emails to all signers
    // Email notification will be implemented when sendSignRequestCancelled is added to email service

    // Audit log
    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign.cancelled",
      userId,
    });

    return this.getSignRequest(id, tenantId);
  }

  /**
   * Internal user signs document (no OTP required)
   */
  async signInternal(
    signRequestId: number,
    userId: number,
    tenantId: number,
    signatureData: string,
    signatureType: string,
    ipAddress: string,
    userAgent: string
  ) {
    // Get sign request
    const signRequest = await this.getSignRequest(signRequestId, tenantId);

    // Find signer for this user
    const signer = await prisma.signers.findFirst({
      where: {
        sign_request_id: signRequestId,
        is_internal: true,
        email: {
          in: await prisma.users.findUnique({
            where: { id: userId },
            select: { email: true }
          }).then(u => u?.email ? [u.email] : [])
        }
      }
    });

    if (!signer) {
      throw ApiError.notFound(
        'Bạn không phải là người ký của tài liệu này',
        'SIGNER_NOT_FOUND'
      );
    }

    // Check if already signed
    if (signer.status === 'signed' || signer.status === 'completed') {
      throw ApiError.badRequest(
        'Bạn đã ký tài liệu này rồi',
        'ALREADY_SIGNED'
      );
    }

    // Check signing order (sequential workflow)
    if (signRequest.workflow_type === 'sequential' && signer.signing_order) {
      const allSigners = await signersRepository.findBySignRequest(signRequestId);
      const previousSigners = allSigners.filter(s => 
        s.signing_order && s.signing_order < signer.signing_order
      );
      
      const allPreviousSigned = previousSigners.every(s => 
        s.status === 'signed' || s.status === 'completed'
      );

      if (!allPreviousSigned) {
        const pendingSigners = previousSigners.filter(s => 
          s.status !== 'signed' && s.status !== 'completed'
        );
        throw ApiError.badRequest(
          `Vui lòng đợi người ký trước hoàn thành. Đang chờ: ${pendingSigners.map(s => s.name).join(', ')}`,
          'SIGNING_ORDER_VIOLATION'
        );
      }
    }

    // Update signer with signature
    await signersRepository.update(signer.id, {
      status: 'signed',
      signed_at: new Date(),
      signature_data: signatureData,
      signature_type: signatureType,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Check if all signers have signed
    const allSigners = await signersRepository.findBySignRequest(signRequestId);
    const allSigned = allSigners.every(s => 
      s.status === 'signed' || s.status === 'completed'
    );

    // Update sign request and document status
    if (allSigned) {
      await signRequestsRepository.updateStatus(signRequestId, tenantId, 'completed');
      if (signRequest.document_id) {
        await documentsRepository.update(signRequest.document_id, {
          status: 'completed'
        });
      }
    } else {
      await signRequestsRepository.updateStatus(signRequestId, tenantId, 'in_progress');
    }

    // Audit log
    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: 'sign.internal_signed',
      userId
    });

    return {
      success: true,
      message: allSigned ? 'Tất cả đã ký xong!' : 'Ký thành công!',
      all_signed: allSigned,
      signer_id: signer.id
    };
  }
}

export const signRequestsService = new SignRequestsService();
