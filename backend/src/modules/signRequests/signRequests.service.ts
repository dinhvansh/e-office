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
import { notificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notifications.types";
import { authorizationService } from "../authorization/authorization.service";

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
  private async ensureCanManageSignRequest(signRequestId: number, tenantId: number, userId: number) {
    const signRequest = await this.getSignRequest(signRequestId, tenantId);
    const decision = await authorizationService.canAccessDocument(
      userId,
      tenantId,
      signRequest.document_id,
      "edit"
    );
    if (!decision.allowed) {
      throw ApiError.forbidden("Permission denied to manage sign request", "SIGN_REQUEST_EDIT_DENIED");
    }
    return signRequest;
  }

  private buildFlowHints(signRequest: any) {
    const signers = Array.isArray(signRequest?.signers) ? signRequest.signers : [];
    const status = signRequest?.status || "draft";
    const pendingCount = signers.filter((s: any) => ["pending", "otp_sent"].includes(s.status)).length;
    const waitingApprovalCount = signers.filter((s: any) => s.status === "waiting_approval").length;
    const waitingSigningCount = signers.filter((s: any) => s.status === "waiting_signing").length;
    const signedCount = signers.filter((s: any) => ["signed", "completed"].includes(s.status)).length;

    let flowState = "DRAFT";
    let nextAction = "EDIT_AND_SEND";

    if (status === "completed") {
      flowState = "COMPLETED";
      nextAction = "VIEW_COMPLETED";
    } else if (status === "cancelled") {
      flowState = "CANCELLED";
      nextAction = "REVIEW_STATUS";
    } else if (status === "rejected") {
      flowState = "REJECTED";
      nextAction = "REVIEW_STATUS";
    } else if (status === "pending_approval" || waitingApprovalCount > 0) {
      flowState = "AWAITING_APPROVAL";
      nextAction = "WAIT_FOR_APPROVAL";
    } else if (status === "pending" || status === "in_progress" || pendingCount > 0 || waitingSigningCount > 0) {
      flowState = "AWAITING_SIGNATURES";
      nextAction = "WAIT_FOR_SIGNING";
    }

    return {
      flow_state: flowState,
      next_action: nextAction,
      flow_counters: {
        total_signers: signers.length,
        pending: pendingCount,
        waiting_approval: waitingApprovalCount,
        waiting_signing: waitingSigningCount,
        signed: signedCount,
      },
    };
  }

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
    return {
      ...signRequest,
      ...this.buildFlowHints(signRequest),
    };
  }

  async listComments(signRequestId: number, tenantId: number) {
    const signRequest = await this.getSignRequest(signRequestId, tenantId);

    return prisma.sign_request_comments.findMany({
      where: {
        tenant_id: tenantId,
        sign_request_id: signRequestId,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    });
  }

  async addComment(signRequestId: number, tenantId: number, userId: number, body: string) {
    const content = body.trim();
    if (!content) {
      throw ApiError.badRequest("Comment is required", "COMMENT_REQUIRED");
    }
    if (content.length > 2000) {
      throw ApiError.badRequest("Comment must be 2000 characters or less", "COMMENT_TOO_LONG");
    }

    const signRequest = await this.getSignRequest(signRequestId, tenantId);

    const comment = await prisma.sign_request_comments.create({
      data: {
        tenant_id: tenantId,
        sign_request_id: signRequestId,
        user_id: userId,
        body: content,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign_request.comment_added",
      userId,
    });

    return comment;
  }

  /**
   * Get sign requests created by the current user with pagination
   */
  async getMySignRequests(
    userId: number, 
    tenantId: number, 
    status?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const where: Prisma.sign_requestsWhereInput = {
      tenant_id: tenantId,
      document: {
        owner_id: userId
      }
    };

    if (status === "pending") {
      where.status = { in: ["pending_approval", "pending", "in_progress"] };
    } else if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.sign_requests.count({ where });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
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
            signing_order: true,
            is_internal: true,
            user_id: true
          },
          orderBy: {
            signing_order: 'asc'
          }
        }
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit
    });

    return {
      data: signRequests.map((request) => ({
        ...request,
        ...this.buildFlowHints(request),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
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
          role: signer.role || 'signer', // ✅ Default to 'signer' if not specified
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

  /**
   * Auto-create internal signers from workflow template
   * Only creates signers for steps with participant_role = 'signer'
   */
  async createInternalSignersFromWorkflow(
    signRequestId: number,
    workflowId: number,
    tenantId: number
  ): Promise<void> {
    // Get workflow steps with participant_role = 'signer'
    const workflowSteps = await prisma.workflow_steps.findMany({
      where: {
        workflow_id: workflowId,
        participant_role: 'signer' // ✅ Only signer steps
      },
      orderBy: {
        step_order: 'asc'
      }
    });

    if (workflowSteps.length === 0) {
      return; // No internal signers in workflow
    }

    // Create signers for each step
    for (const step of workflowSteps) {
      let userId: number | null = null;
      let email = '';
      let name = '';

      // Determine user based on approver_type
      if (step.approver_type === 'user' && step.approver_id) {
        const user = await prisma.users.findUnique({
          where: { id: step.approver_id },
          select: { id: true, email: true, full_name: true, status: true }
        });
        if (user && user.status === 'active') {
          userId = user.id;
          email = user.email;
          name = user.full_name || user.email;
        }
      } else if (step.approver_type === 'role' && step.approver_id) {
        // Get first active user with this role
        const userRole = await prisma.user_roles.findFirst({
          where: { role_id: step.approver_id },
          include: { 
            user: { 
              select: { id: true, email: true, full_name: true, status: true } 
            } 
          }
        });
        if (userRole?.user && userRole.user.status === 'active') {
          userId = userRole.user.id;
          email = userRole.user.email;
          name = userRole.user.full_name || userRole.user.email;
        }
      } else if (step.approver_type === 'department' && step.approver_id) {
        // Get department manager
        const dept = await prisma.departments.findUnique({
          where: { id: step.approver_id },
          include: { 
            manager: { 
              select: { id: true, email: true, full_name: true, status: true } 
            } 
          }
        });
        if (dept?.manager && dept.manager.status === 'active') {
          userId = dept.manager.id;
          email = dept.manager.email;
          name = dept.manager.full_name || dept.manager.email;
        }
      }
      // Note: 'manager' type cannot be determined at workflow config time
      // It requires document owner context, so skip for now

      // Create signer if user found
      if (userId && email) {
        const signerData: Prisma.signersCreateInput = {
          sign_request: { connect: { id: signRequestId } },
          email,
          name,
          role: 'signer',
          signing_order: step.step_order,
          status: 'pending',
          is_internal: true,
          user: { connect: { id: userId } }
        };

        await signersRepository.create(signerData);
      }
    }
  }

  async addSigner(
    signRequestId: number,
    tenantId: number,
    userId: number,
    signerData: SignerInput & { signing_order?: number }
  ) {
    // Verify sign request exists and belongs to tenant
    const signRequest = await this.ensureCanManageSignRequest(signRequestId, tenantId, userId);

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
      position_data: signerData.position_data as Prisma.InputJsonValue,
    };

    // ✅ Add user relation if internal
    if (internalUser) {
      signerCreateData.user = { connect: { id: internalUser.id } };
    }

    const signer = await signersRepository.create(signerCreateData);

    return signer;
  }

  async sendSignRequest(id: number, tenantId: number, userId: number) {
    const signRequest = await this.ensureCanManageSignRequest(id, tenantId, userId);

    this.ensureSendableStatus(signRequest.status || "");
    await this.validateSignFieldsIfNeeded(id);

    if (signRequest.status === "draft") {
      const movedToApproval = await this.submitDraftToApprovalIfRequired(signRequest, tenantId, userId);
      if (movedToApproval) {
        return this.getSignRequestWithFlowHints(id, tenantId);
      }

      await this.submitDraftToSigning(signRequest, tenantId);
    } else if (signRequest.status === "pending_approval") {
      await signRequestsRepository.updateStatus(id, tenantId, "pending");
    }

    await this.generateSignerTokens(id, signRequest.status === "draft");
    const signersWithTokens = await signersRepository.findBySignRequest(id);

    if (signersWithTokens.some((s) => s.status === "waiting_approval")) {
      return this.getSignRequestWithFlowHints(id, tenantId);
    }

    if (signRequest.status === "draft") {
      await signRequestsRepository.updateStatus(id, tenantId, "pending");
    }

    await this.notifyPendingSigners(signRequest, signersWithTokens, tenantId, userId);

    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign.sent",
      userId,
    });

    return this.getSignRequestWithFlowHints(id, tenantId);
  }

  private async getSignRequestWithFlowHints(id: number, tenantId: number) {
    const signRequest: any = await this.getSignRequest(id, tenantId);
    return {
      ...signRequest,
      ...this.buildFlowHints(signRequest),
    };
  }

  private ensureSendableStatus(status: string) {
    if (status === "completed" || status === "cancelled" || status === "rejected") {
      throw ApiError.badRequest(
        `Cannot send sign request with status: ${status}`,
        "SIGN_REQUEST_INVALID_STATUS"
      );
    }
  }

  private async validateSignFieldsIfNeeded(signRequestId: number) {
    const fieldCount = await signRequestsRepository.countFields(signRequestId);
    if (fieldCount === 0) return;

    const validation = await signRequestFieldsService.validateFieldsBeforeSend(signRequestId);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.message || "Field validation failed");
    }
  }

  private async submitDraftToApprovalIfRequired(signRequest: any, tenantId: number, userId: number) {
    const documentType = signRequest.document?.document_type_id
      ? await prisma.document_types.findUnique({
          where: { id: signRequest.document.document_type_id },
        })
      : null;

    if (!documentType?.require_approval) return false;

    const draftSigners = await signersRepository.findBySignRequest(signRequest.id);
    for (const signer of draftSigners) {
      await signersRepository.update(signer.id, { status: "waiting_approval" });
    }

    await signRequestsRepository.updateStatus(signRequest.id, tenantId, "pending_approval");

    const documentWorkflow = await prisma.workflows.findFirst({
      where: {
        tenant_id: tenantId,
        created_for_doc: signRequest.document_id,
        is_active: true,
      },
      orderBy: { id: "desc" },
    });

    const workflowId = documentWorkflow?.id || documentType.default_workflow_id;
    if (!workflowId) {
      throw ApiError.badRequest("Workflow is required for approval flow", "WORKFLOW_REQUIRED");
    }

    const { approvalsService } = await import("../approvals/approvals.service");
    await approvalsService.submitForApproval(signRequest.document_id, workflowId, tenantId, userId);

    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign.submitted_for_approval",
      userId,
    });

    return true;
  }

  private async submitDraftToSigning(signRequest: any, tenantId: number) {
    const orderedSigners = (await signersRepository.findBySignRequest(signRequest.id)).sort(
      (a, b) => (a.signing_order || 0) - (b.signing_order || 0)
    );

    if (orderedSigners.length === 0) {
      throw ApiError.badRequest(
        "Sign request must have at least one signer before sending",
        "SIGNERS_REQUIRED"
      );
    }

    for (let index = 0; index < orderedSigners.length; index += 1) {
      const signer = orderedSigners[index];
      await signersRepository.update(signer.id, {
        status: index === 0 ? "pending" : "waiting_signing",
      });
    }

    if (signRequest.document_id) {
      await documentsRepository.update(signRequest.document_id, {
        status: "pending_signature",
      });
    }
  }

  private async generateSignerTokens(signRequestId: number, fromDraft: boolean) {
    const signers = await signersRepository.findBySignRequest(signRequestId);
    for (const signer of signers) {
      if (!signer.signing_token || !fromDraft) {
        const token = crypto.randomBytes(32).toString("hex");
        await signersRepository.update(signer.id, { signing_token: token });
      }
    }
  }

  private async notifyPendingSigners(
    signRequest: any,
    signersWithTokens: any[],
    tenantId: number,
    userId: number
  ) {
    const { emailService } = await import("../common/email.service");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const pendingSigners = signersWithTokens.filter((s) => s.status === "pending");

    const sender = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true }
    });

    for (const signer of pendingSigners) {
      if (signer.is_internal && signer.user_id) {
        await notificationsService.createNotification({
          tenantId,
          userId: signer.user_id,
          type: NotificationType.SIGN_REQUEST,
          title: "Yeu cau ky moi",
          message: `Ban co yeu cau ky cho tai lieu "${signRequest.title || signRequest.document?.title || "Document"}"`,
          link: `/sign-requests/${signRequest.id}/internal-sign`,
        }).catch(err => console.error(`Failed to create notification for user ${signer.user_id}:`, err));
        continue;
      }

      if (!signer.is_internal && signer.signing_token) {
        const signUrl = `${frontendUrl}/sign/${signer.signing_token}`;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const bcrypt = require("bcrypt");
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

        await signersRepository.update(signer.id, {
          otp: otpHash,
          otp_expire: otpExpire,
          status: "otp_sent"
        });

        try {
          await emailService.sendSignRequestWithOTP({
            recipientEmail: signer.email,
            recipientName: signer.name,
            documentTitle: signRequest.title || signRequest.document?.title || "Document",
            documentNumber: signRequest.document?.document_number,
            senderName: sender?.full_name || sender?.email || "System",
            message: signRequest.message,
            signUrl,
            otp,
            expiryMinutes: 10
          });
        } catch (error: any) {
          console.error(`Failed to send email to ${signer.email}:`, error?.message || error);
        }
      }
    }
  }

  /**
   * Cancel sign request and notify all signers
   */
  async cancelSignRequest(id: number, tenantId: number, userId: number, reason?: string) {
    const signRequest = await this.ensureCanManageSignRequest(id, tenantId, userId);

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

    // Update sign request status with cancellation info
    await prisma.sign_requests.update({
      where: { id, tenant_id: tenantId },
      data: {
        status: "cancelled",
        cancellation_reason: reason || "Không có lý do",
        cancelled_at: new Date(),
        cancelled_by: userId,
      },
    });

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
    signatureData: string | Record<string, string>,  // Support both formats
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

    // Handle signature data - convert to string if it's an object
    let finalSignatureData: string;
    if (typeof signatureData === 'string') {
      // Old format: single signature
      finalSignatureData = signatureData;
    } else {
      // New format: field_signatures object
      // For now, just take the first signature (backward compatibility)
      // TODO: Store all field signatures properly
      const firstSignature = Object.values(signatureData)[0];
      finalSignatureData = firstSignature || '';
      
      // Store field signatures in position_data for future use
      await signersRepository.update(signer.id, {
        position_data: signatureData as any
      });
    }

    // Update signer with signature
    await signersRepository.update(signer.id, {
      status: 'signed',
      signed_at: new Date(),
      signature_data: finalSignatureData,
      signature_type: signatureType,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // ✅ SEQUENTIAL WORKFLOW: Activate next signer
    if (signRequest.workflow_type === 'sequential' && signer.signing_order) {
      const allSigners = await signersRepository.findBySignRequest(signRequestId);
      
      // Find next signer in order
      const nextSigner = allSigners.find(s => 
        s.signing_order === (signer.signing_order! + 1) &&
        s.status === 'waiting_signing'
      );

      if (nextSigner) {
        console.log(`[Sequential Signing] Activating next signer: ${nextSigner.name} (order ${nextSigner.signing_order})`);
        await signersRepository.update(nextSigner.id, {
          status: 'pending'
        });

        // Send notification to next signer
        if (nextSigner.is_internal && nextSigner.user_id) {
          try {
            await notificationsService.createNotification({
              tenantId,
              userId: nextSigner.user_id,
              type: NotificationType.SIGN_REQUEST,
              title: 'Đến lượt bạn ký tài liệu',
              message: `Tài liệu "${signRequest.title}" đang chờ bạn ký`,
              link: `/sign-requests/${signRequestId}/internal-sign`
            });
          } catch (error) {
            console.error('Failed to send notification to next signer:', error);
          }
        }
      }
    }

    // Check if all signers have signed
    const allSigners = await signersRepository.findBySignRequest(signRequestId);
    const allSigned = allSigners.every(s => 
      s.status === 'signed' || s.status === 'completed'
    );

    // ✅ PROGRESSIVE PDF: Generate PDF after each signature
    try {
      console.log(`[Internal Signing] Generating progressive PDF for sign request ${signRequestId}`);
      const { pdfGenerationService } = await import('./pdfGeneration.service');
      
      const signedPdfPath = await pdfGenerationService.generateProgressivePdf(
        signRequestId,
        {
          includeAuditTrail: allSigned,  // Only add audit trail when completed
          addWatermark: !allSigned        // Add watermark if not completed
        }
      );
      
      // Update document with signed PDF path
      await documentsRepository.update(signRequest.document_id, {
        signed_file_path: signedPdfPath,
        status: allSigned ? 'completed' : 'in_progress'
      } as any);
      
      console.log(`[Internal Signing] Progressive PDF generated: ${signedPdfPath}`);
    } catch (error: any) {
      console.error(`[Internal Signing] Failed to generate progressive PDF: ${error.message}`);
      // Don't fail the signing process if PDF generation fails
    }

    // Update sign request status
    if (allSigned) {
      await signRequestsRepository.updateStatus(signRequestId, tenantId, 'completed');
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

  // ✅ Phase 2: Get Signers
  async getSigners(signRequestId: number, tenantId: number) {
    const signRequest = await this.getSignRequest(signRequestId, tenantId);
    return await signersRepository.findBySignRequest(signRequestId);
  }

  // ✅ Phase 2: Remove Signer
  async removeSignerFromRequest(signRequestId: number, signerId: number, tenantId: number, userId: number) {
    await this.ensureCanManageSignRequest(signRequestId, tenantId, userId);

    // Remove fields assigned to this signer
    await prisma.sign_request_fields.deleteMany({
      where: { assigned_signer_id: signerId }
    });

    // Delete signer
    await signersRepository.delete(signerId);

    // Reorder remaining signers
    const remainingSigners = await signersRepository.findBySignRequest(signRequestId);
    const sortedSigners = remainingSigners.sort((a, b) => 
      (a.signing_order || 0) - (b.signing_order || 0)
    );

    for (let i = 0; i < sortedSigners.length; i++) {
      await signersRepository.update(sortedSigners[i].id, {
        signing_order: i + 1
      });
    }

    // Audit log (optional - may fail if audit service has issues)
    try {
      await auditService.record({
        tenantId,
        documentId: null as any,
        event: 'sign_request.signer_removed'
      } as any);
    } catch (error: any) {
      console.error('⚠️ Audit log failed (non-critical):', error.message);
    }
  }

  // ✅ Phase 2: Update Signer
  async updateSigner(
    signerId: number,
    updates: Partial<SignerInput & { signing_order?: number }>,
    tenantId: number,
    userId: number
  ) {
    // Get signer to verify tenant
    const signer = await signersRepository.findById(signerId);
    if (!signer) {
      throw ApiError.notFound('Signer not found', 'SIGNER_NOT_FOUND');
    }

    // Verify sign request belongs to tenant
    await this.ensureCanManageSignRequest(signer.sign_request_id, tenantId, userId);

    // If email changed, check if new email is internal user
    if (updates.email && updates.email !== signer.email) {
      const internalUser = await prisma.users.findFirst({
        where: {
          tenant_id: tenantId,
          email: updates.email,
          status: 'active'
        },
        select: { id: true }
      });

      // Update is_internal and user relation based on new email
      const updateData: any = {
        ...updates,
        is_internal: !!internalUser,
      };

      // ✅ Use Prisma relation for user_id
      if (internalUser) {
        updateData.user = { connect: { id: internalUser.id } };
      } else if (signer.user_id) {
        // Disconnect if was internal but now external
        updateData.user = { disconnect: true };
      }

      await signersRepository.update(signerId, updateData);
    } else {
      // Just update other fields
      await signersRepository.update(signerId, updates as any);
    }

    // Audit log (optional - may fail if audit service has issues)
    try {
      await auditService.record({
        tenantId,
        documentId: null as any,
        event: 'sign_request.signer_updated'
      } as any);
    } catch (error: any) {
      console.error('⚠️ Audit log failed (non-critical):', error.message);
    }

    return await signersRepository.findById(signerId);
  }

  // ✅ Reorder Signers (Drag & Drop)
  async reorderSigners(
    signRequestId: number,
    tenantId: number,
    userId: number,
    signers: Array<{ id: number; signing_order: number }>
  ) {
    // Verify sign request belongs to tenant
    await this.ensureCanManageSignRequest(signRequestId, tenantId, userId);

    // Update signing_order for each signer
    for (const signer of signers) {
      await signersRepository.update(signer.id, {
        signing_order: signer.signing_order,
      });
    }

    // Audit log (optional)
    try {
      await auditService.record({
        tenantId,
        documentId: null as any,
        event: 'sign_request.signers_reordered'
      } as any);
    } catch (error: any) {
      console.error('⚠️ Audit log failed (non-critical):', error.message);
    }

    return { success: true };
  }

  /**
   * Delete sign request (draft only)
   */
  async deleteSignRequest(id: number, tenantId: number, userId: number) {
    const signRequest = await this.ensureCanManageSignRequest(id, tenantId, userId);

    // Only allow deleting draft sign requests
    if (signRequest.status !== 'draft') {
      throw ApiError.badRequest(
        'Chỉ có thể xóa văn bản ở trạng thái nháp',
        'SIGN_REQUEST_DELETE_DENIED'
      );
    }

    // Delete all related data
    // 1. Delete fields
    await prisma.sign_request_fields.deleteMany({
      where: { sign_request_id: id }
    });

    // 2. Delete signers
    await prisma.signers.deleteMany({
      where: { sign_request_id: id }
    });

    // 3. Delete sign request
    await prisma.sign_requests.delete({
      where: { id }
    });

    // Audit log
    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: 'sign.deleted',
      userId,
    });

    return { deleted: true };
  }

  /**
   * Revoke completed internal document
   * Reset to draft status for re-signing
   */
  async revokeSignRequest(id: number, tenantId: number, userId: number) {
    const signRequest = await this.ensureCanManageSignRequest(id, tenantId, userId);

    // Only allow revoking completed sign requests
    if (signRequest.status !== 'completed') {
      throw ApiError.badRequest(
        'Chỉ có thể thu hồi văn bản đã hoàn thành',
        'SIGN_REQUEST_REVOKE_DENIED'
      );
    }

    // Check if all signers are internal
    const signers = await signersRepository.findBySignRequest(id);
    const hasExternalSigners = signers.some(s => !s.is_internal);
    
    if (hasExternalSigners) {
      throw ApiError.badRequest(
        'Không thể thu hồi văn bản có người ký bên ngoài',
        'SIGN_REQUEST_REVOKE_EXTERNAL_DENIED'
      );
    }

    // Reset all signers to pending status
    for (const signer of signers) {
      await signersRepository.update(signer.id, {
        status: 'pending',
        signed_at: null,
        signature_data: null,
        signature_type: null,
        ip_address: null,
        user_agent: null,
        otp: null,
        otp_expire: null,
        signing_token: null
      });
    }

    // Update sign request status back to draft
    await signRequestsRepository.updateStatus(id, tenantId, 'draft');

    // Update document status back to draft
    if (signRequest.document_id) {
      await documentsRepository.update(signRequest.document_id, {
        status: 'draft',
      });
    }

    // Audit log
    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: 'sign.revoked',
      userId,
    });

    return this.getSignRequest(id, tenantId);
  }
}

export const signRequestsService = new SignRequestsService();
