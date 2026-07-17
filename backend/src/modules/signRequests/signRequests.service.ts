import { Prisma } from "@prisma/client";
import * as crypto from "crypto";
import { prisma } from "../../config/prisma";
import { storageService } from "../../core/storage/storage.service";
import { readStoredFile } from "../../core/storage/fileStorage";
import { ApiError } from "../../core/errors/api-error";
import { auditService } from "../audit/audit.service";
import { documentsRepository } from "../documents/documents.repository";
import { licenseService } from "../licenses/license.service";
import { signersRepository } from "../signers/signers.repository";
import { signRequestsRepository } from "./signRequests.repository";
import { signRequestFieldsService } from "./signRequestFields.service";
import { notificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notifications.types";
import { authorizationService } from "../authorization/authorization.service";
import { documentWorkflowOrchestratorService } from "../documents/documentWorkflowOrchestrator.service";
import { canSignerActInOrder } from "./signingOrder.policy";
import { workflowStateService } from "../workflows/workflowState.service";
import { buildSignRequestFlowHints, canSendSignRequestStatus, isEditableSignRequestStatus } from "./signRequestFlow.policy";
import { signRequestQueriesService } from "./signRequestQueries.service";
import type { SignRequestFlowSigner } from "./signRequestFlow.policy";
import { signingProgressService } from "./signingProgress.service";
import { signRequestQueryService } from "./signRequestQuery.service";
import { signRequestDraftService, type CreateDraftSignRequestInput } from "./signRequestDraft.service";
import { signerManagementService } from "./signerManagement.service";
import { signRequestLifecycleService } from "./signRequestLifecycle.service";
import { internalSigningCommandService } from "./internalSigningCommand.service";
import { documentsService } from "../documents/documents.service";
import bcrypt from "bcrypt";

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
  private isEditableStatus(status: string | null | undefined) {
    return isEditableSignRequestStatus(status);
  }

  private ensureEditableStatus(status: string | null | undefined) {
    if (!this.isEditableStatus(status)) {
      throw ApiError.badRequest(
        "Cannot edit sign request after sign request is sent",
        "SIGN_REQUEST_EDIT_DENIED"
      );
    }
  }

  private async findInternalSignerForUser(signRequestId: number, userId: number) {
    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!currentUser?.email) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }

    const signer = await prisma.signers.findFirst({
      where: {
        sign_request_id: signRequestId,
        is_internal: true,
        OR: [
          { user_id: currentUser.id },
          { email: currentUser.email },
        ],
      },
    });

    if (!signer) {
      throw ApiError.notFound(
        "Báº¡n khÃ´ng pháº£i lÃ  ngÆ°á»i kÃ½ cá»§a tÃ i liá»‡u nÃ y",
        "SIGNER_NOT_FOUND"
      );
    }

    return signer;
  }

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

  private buildFlowHints(signRequest: { status?: string | null; signers?: SignRequestFlowSigner[] | null }) {
    return buildSignRequestFlowHints(signRequest.status, signRequest.signers ?? []);
  }

  async listSignRequests(tenantId: number, userId: number) {
    return signRequestQueryService.listSignRequests(tenantId, userId);
  }

  /**
   * Get single sign request by ID
   */
  async getSignRequest(id: number, tenantId: number, userId?: number) {
    return signRequestQueriesService.getSignRequest(id, tenantId, userId);
  }

  async listComments(signRequestId: number, tenantId: number, userId: number) {
    await this.getSignRequest(signRequestId, tenantId, userId);

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
        attachments: { include: { uploader: { select: { id: true, full_name: true, email: true } } } },
      },
      orderBy: { created_at: "asc" },
    });
  }

  async addComment(signRequestId: number, tenantId: number, userId: number, body: string, attachments: Array<{ file_name: string; file_base64: string; file_type?: string }> = []) {
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

    const document = await prisma.documents.findFirst({
      where: { id: signRequest.document_id, tenant_id: tenantId },
      select: {
        owner_id: true,
        title: true,
        original_file_name: true,
      },
    });

    if (document?.owner_id && document.owner_id !== userId) {
      const commenter = comment.user?.full_name || comment.user?.email || "Người dùng";
      await notificationsService.createNotification({
        tenantId,
        userId: document.owner_id,
        type: NotificationType.DOCUMENT_COMMENTED,
        title: "Có bình luận mới trong luồng ký",
        message: `${commenter} đã bình luận trên tài liệu "${document.title || document.original_file_name || "Untitled"}"`,
        link: `/documents/${signRequest.document_id}/flow#discussion`,
      });
    }

    for (const attachment of attachments) {
      await documentsService.addAttachment(signRequest.document_id, tenantId, userId, {
        ...attachment,
        attachment_kind: "COMMENT_ATTACHMENT",
        comment_id: comment.id,
      });
    }
    return prisma.sign_request_comments.findUniqueOrThrow({
      where: { id: comment.id },
      include: { user: { select: { id: true, full_name: true, email: true } }, attachments: { include: { uploader: { select: { id: true, full_name: true, email: true } } } } },
    });
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
    return signRequestQueryService.getMySignRequests(userId, tenantId, status, page, limit);
  }

  /**
   * Create draft sign request (auto-created by system)
   */
  async createDraftSignRequest(data: CreateDraftSignRequestInput) {
    return signRequestDraftService.createDraftSignRequest(data);
  }

  async createSignRequest(tenantId: number, userId: number, input: CreateSignRequestInput) {
    await licenseService.ensureLicenseForTenant(tenantId);
    const document = await documentsRepository.findById(input.document_id, tenantId);
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    let signerRows: Prisma.signersCreateManyInput[] = [];
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

      signerRows = input.signers.map((signer) => ({
          sign_request_id: 0,
          email: signer.email,
          name: signer.name,
          role: signer.role || 'signer', // ✅ Default to 'signer' if not specified
          status: "pending",
          is_internal: internalUserMap.has(signer.email), // ✅ Set based on user existence
          user_id: internalUserMap.get(signer.email) || null, // ✅ Set user_id for internal users
          position_data: signer.position_data ? (signer.position_data as Prisma.InputJsonValue) : undefined,
        }));
    }

    const signRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.sign_requests.create({
        data: {
          tenant_id: tenantId,
          document_id: document.id,
          title: input.title,
          message: input.message,
          workflow_type: input.workflow_type ?? "sequential",
          status: "draft",
          deadline: input.deadline ?? null,
        },
      });
      if (signerRows.length) {
        await tx.signers.createMany({
          data: signerRows.map((signer) => ({ ...signer, sign_request_id: created.id })),
        });
      }
      await tx.audit_logs.create({
        data: { document_id: document.id, event: "sign.started", user_id: userId },
      });
      await tx.outbox_events.create({
        data: {
          tenant_id: tenantId,
          aggregate_type: "sign_request",
          aggregate_id: String(created.id),
          event_type: "SIGN_REQUEST_CREATED",
          payload: { sign_request_id: created.id, document_id: document.id },
          deduplication_key: `sign-request-created:${created.id}`,
        },
      });
      return created;
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
    const signRequest = await this.ensureCanManageSignRequest(signRequestId, tenantId, userId);
    this.ensureEditableStatus(signRequest.status);
    return signerManagementService.createDraftSigner(signRequestId, tenantId, signerData);
  }

  async sendSignRequest(id: number, tenantId: number, userId: number) {
    const signRequest = await this.ensureCanManageSignRequest(id, tenantId, userId);

    this.ensureSendableStatus(signRequest.status || "");
    await this.validateSignFieldsIfNeeded(id);

    if (signRequest.status === "rejected") {
      await this.prepareRejectedForResubmission(id, tenantId, userId);
    }

    if (signRequest.status === "draft" || signRequest.status === "rejected") {
      const runtime = await documentWorkflowOrchestratorService.beginRuntimeFlow(id, tenantId, userId);

      if (runtime.phase === "approval") {
        await auditService.record({
          tenantId,
          documentId: signRequest.document_id,
          event: "sign.submitted_for_approval",
          userId,
        });
        return this.getSignRequestWithFlowHints(id, tenantId);
      }

      if (runtime.phase === "completed") {
        return this.getSignRequestWithFlowHints(id, tenantId);
      }

      await this.dispatchPendingSigners(id, tenantId, userId, true);
      return this.getSignRequestWithFlowHints(id, tenantId);
    }

    if (signRequest.status === "pending_approval") {
      return this.getSignRequestWithFlowHints(id, tenantId);
    }

    await this.dispatchPendingSigners(id, tenantId, userId, false);
    return this.getSignRequestWithFlowHints(id, tenantId);
  }

  async dispatchPendingSigners(
    signRequestId: number,
    tenantId: number,
    userId: number,
    fromDraft: boolean
  ) {
    const signRequest = await this.getSignRequest(signRequestId, tenantId);
    await this.generateSignerTokens(signRequestId, fromDraft);

    const signersWithTokens = await signersRepository.findBySignRequest(signRequestId);
    if (signersWithTokens.some((signer) => signer.status === "waiting_approval")) {
      return;
    }

    await this.notifyPendingSigners(signRequest, signersWithTokens, tenantId, userId);

    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign.sent",
      userId,
    });
  }

  async remindPendingParticipants(id: number, tenantId: number, userId: number) {
    const signRequest = await this.ensureCanManageSignRequest(id, tenantId, userId);
    const { emailService } = await import("../common/email.service");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    let approvalsReminded = 0;
    let internalSignersReminded = 0;
    let externalSignersReminded = 0;

    if (signRequest.document_id) {
      const document = await prisma.documents.findUnique({
        where: { id: signRequest.document_id },
        include: {
          workflow_instance: {
            include: {
              workflow: true,
              current_step: true,
            },
          },
          owner: {
            select: { full_name: true, email: true },
          },
        },
      });

      const currentStepId = document?.workflow_instance?.current_step_id || null;
      if (currentStepId) {
        const pendingApprovals = await prisma.document_approvals.findMany({
          where: {
            document_id: signRequest.document_id,
            workflow_step_id: currentStepId,
            action: "pending",
          },
          include: {
            approver: {
              select: { id: true, email: true, full_name: true },
            },
            workflow_step: {
              select: { step_name: true, step_order: true },
            },
          },
        });

        const approvalUrl = `${frontendUrl}/approvals`;

        for (const approval of pendingApprovals) {
          await notificationsService.createNotification({
            tenantId,
            userId: approval.approver.id,
            type: NotificationType.APPROVAL_REQUEST,
            title: "Nhắc phê duyệt tài liệu",
            message: `Tài liệu "${signRequest.title || document?.title || "Document"}" đang chờ bạn phê duyệt`,
            link: "/approvals?filter=pending",
          }).catch((error) => console.error("Failed to create approval reminder notification:", error));

          await emailService.sendApprovalRequestNotification({
            tenantId,
            recipientEmail: approval.approver.email,
            recipientName: approval.approver.full_name || approval.approver.email,
            documentTitle: signRequest.title || document?.title || "Untitled",
            documentNumber: document?.document_number || "",
            submitterName: document?.owner?.full_name || document?.owner?.email || "System",
            workflowName: document?.workflow_instance?.workflow?.name || "Workflow",
            stepName: approval.workflow_step.step_name || `Bước ${approval.workflow_step.step_order}`,
            dueDate: approval.due_date || undefined,
            approvalUrl,
            comment: "Đây là email nhắc nhở phê duyệt từ người gửi.",
          }).catch((error) => console.error("Failed to send approval reminder email:", error));

          approvalsReminded += 1;
        }
      }
    }

    const sender = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true },
    });

    const signers = await signersRepository.findBySignRequest(id);
    const pendingSigners = signers.filter((signer) => signer.status === "pending" || signer.status === "otp_sent");

    for (const signer of pendingSigners) {
      if (signer.is_internal && signer.user_id) {
        await notificationsService.createNotification({
          tenantId,
          userId: signer.user_id,
          type: NotificationType.SIGN_REQUEST,
          title: "Nhắc ký tài liệu",
          message: `Tài liệu "${signRequest.title || signRequest.document?.title || "Document"}" vẫn đang chờ bạn ký`,
          link: `/sign-requests/${id}/internal-sign`,
        }).catch((error) => console.error("Failed to create signer reminder notification:", error));

        internalSignersReminded += 1;
        continue;
      }

      if (!signer.is_internal && signer.email) {
        let signingToken = signer.signing_token;
        if (!signingToken) {
          signingToken = crypto.randomBytes(32).toString("hex");
          await signersRepository.update(signer.id, { signing_token: signingToken });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpire = new Date(Date.now() + 10 * 60 * 1000);
        const signUrl = `${frontendUrl}/sign/${signingToken}`;        try {
          await emailService.sendSignRequestWithOTP({
            tenantId,
            recipientEmail: signer.email,
            recipientName: signer.name,
            documentTitle: signRequest.title || signRequest.document?.title || "Document",
            documentNumber: signRequest.document?.document_number,
            senderName: sender?.full_name || sender?.email || "System",
            signUrl,
            otp,
            expiryMinutes: 10,
          });

          await signersRepository.update(signer.id, {
            otp: otpHash,
            otp_expire: otpExpire,
            status: "otp_sent",
          });

          externalSignersReminded += 1;
        } catch (error: unknown) {
          console.error(
            `Failed to send signer reminder email to ${signer.email}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign.reminded",
      userId,
    });

    return {
      reminded: true,
      approvals_reminded: approvalsReminded,
      internal_signers_reminded: internalSignersReminded,
      external_signers_reminded: externalSignersReminded,
      total_reminded: approvalsReminded + internalSignersReminded + externalSignersReminded,
    };
  }

  private async getSignRequestWithFlowHints(id: number, tenantId: number) {
    return signRequestQueriesService.getSignRequestWithFlowHints(id, tenantId);
  }

  private ensureSendableStatus(status: string) {
    if (!canSendSignRequestStatus(status)) {
      throw ApiError.badRequest(
        `Cannot send sign request with status: ${status}`,
        "SIGN_REQUEST_INVALID_STATUS"
      );
    }
  }

  private async prepareRejectedForResubmission(signRequestId: number, tenantId: number, userId: number) {
    const signRequest = await this.getSignRequest(signRequestId, tenantId);
    if (signRequest.status !== "rejected") {
      return;
    }

    await prisma.sign_request_comments.create({
      data: {
        tenant_id: tenantId,
        sign_request_id: signRequestId,
        user_id: userId,
        body: "Gửi lại luồng ký sau khi bị từ chối",
      },
    });

    await prisma.document_approvals.deleteMany({
      where: { document_id: signRequest.document_id },
    });

    await prisma.workflow_instances.deleteMany({
      where: { document_id: signRequest.document_id },
    });

    const signers = await signersRepository.findBySignRequest(signRequestId);
    for (const signer of signers) {
      await signersRepository.update(signer.id, {
        status: "draft",
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

    await prisma.sign_requests.update({
      where: { id: signRequestId, tenant_id: tenantId },
      data: {
        status: "draft",
      },
    });

    await prisma.documents.update({
      where: { id: signRequest.document_id },
      data: {
        status: "draft",
        signed_file_path: null,
      },
    });
  }

  private async validateSignFieldsIfNeeded(signRequestId: number) {
    const fieldCount = await signRequestsRepository.countFields(signRequestId);
    if (fieldCount === 0) return;

    const validation = await signRequestFieldsService.validateFieldsBeforeSend(signRequestId);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.message || "Field validation failed");
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
    signRequest: {
      id: number;
      title: string | null;
      message: string | null;
      document?: { title: string | null; document_number: string | null } | null;
    },
    signersWithTokens: Array<{
      id: number;
      status: string | null;
      is_internal: boolean;
      user_id: number | null;
      signing_token: string | null;
      email: string | null;
      name: string | null;
    }>,
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
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

        try {
          await emailService.sendSignRequestWithOTP({
            tenantId,
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

          await signersRepository.update(signer.id, {
            otp: otpHash,
            otp_expire: otpExpire,
            status: "otp_sent"
          });
        } catch (error: unknown) {
          console.error(`Failed to send email to ${signer.email}:`, error instanceof Error ? error.message : error);
        }
      }
    }
  }

  /**
   * Cancel sign request and notify all signers
   */
  async cancelSignRequest(id: number, tenantId: number, userId: number, reason?: string) {
    const signRequest = await this.ensureCanManageSignRequest(id, tenantId, userId);
    await signRequestLifecycleService.cancel(signRequest, id, tenantId, userId, reason);

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
      if (!canSignerActInOrder(signRequest.workflow_type, signer.signing_order, allSigners)) {
        const previousSigners = allSigners.filter(s =>
          s.signing_order && s.signing_order < signer.signing_order
        );
        const pendingSigners = previousSigners.filter(s => 
          s.status !== 'signed' && s.status !== 'completed'
        );
        throw ApiError.conflict(
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
      
    }

    const completionConfig = signer.signing_order && signRequest.document_id
      ? await signingProgressService.getSignerStepCompletionConfig(signRequest.document_id, signer.signing_order)
      : null;

    // State changes that make a signature visible must commit together.  PDF
    // generation and notifications intentionally happen after this transaction.
    await internalSigningCommandService.persistSignature({
      signRequestId,
      tenantId,
      userId,
      signer,
      signRequest,
      completionConfig,
      signatureData,
      finalSignatureData,
      signatureType,
      ipAddress,
      userAgent,
    });

    // Check if all signers have signed
    const allSigners = await signersRepository.findBySignRequest(signRequestId);
    const allSigned = allSigners.every((s) => signingProgressService.isSignerStatusComplete(s.status));

    // ✅ PROGRESSIVE PDF: Generate PDF after each signature
    if (!allSigned) try {
      console.log(`[Internal Signing] Generating progressive PDF for sign request ${signRequestId}`);
      const { pdfGenerationService } = await import('./pdfGeneration.service');
      
      const signedPdfPath = await pdfGenerationService.generateProgressivePdf(
        signRequestId,
        {
          includeAuditTrail: false,
          addWatermark: true,
        }
      );
      const artifactBytes = await readStoredFile(storageService, signedPdfPath);
      const artifactHash = crypto.createHash("sha256").update(artifactBytes).digest("hex");
      
      await prisma.$transaction((tx) => workflowStateService.transitionSigningPair(tx, {
        documentId: signRequest.document_id,
        signRequestId,
        documentStatus: "in_progress",
        signRequestStatus: "in_progress",
        signedFilePath: signedPdfPath,
        hash: artifactHash,
      }));
      
      console.log(`[Internal Signing] Progressive PDF generated: ${signedPdfPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown artifact generation error";
      console.error(`[Internal Signing] Failed to generate progressive PDF: ${message}`);
    }

    if (allSigned) {
      try {
        const { emailService } = await import("../common/email.service");
        const documentWithOwner = await prisma.documents.findUnique({
          where: { id: signRequest.document_id },
          include: {
            owner: {
              select: {
                email: true,
                full_name: true,
              },
            },
          },
        });
        const owner = documentWithOwner?.owner;
        if (owner?.email) {
          const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
          await emailService.sendSignCompletedNotification({
            tenantId,
            recipientEmail: owner.email,
            recipientName: owner.full_name || owner.email,
            documentTitle: signRequest.title || signRequest.document?.title || "Document",
            documentNumber: signRequest.document?.document_number || undefined,
            signerName: signer.name || signer.email,
            documentUrl: `${frontendUrl}/documents/${signRequest.document_id}/flow`
          });
        }
      } catch (error) {
        console.error("Failed to send sign completed email:", error);
      }
    }

    return {
      success: true,
      message: allSigned ? 'Tất cả đã ký xong!' : 'Ký thành công!',
      all_signed: allSigned,
      signer_id: signer.id
    };
  }

  async retrySignedArtifactGeneration(signRequestId: number, tenantId: number, userId: number) {
    const signRequest = await this.ensureCanManageSignRequest(signRequestId, tenantId, userId);
    return signRequestLifecycleService.retrySignedArtifactGeneration(signRequest, signRequestId, tenantId);
  }

  // ✅ Phase 2: Get Signers
  async rejectInternal(
    signRequestId: number,
    userId: number,
    tenantId: number,
    comment: string,
    ipAddress: string,
    userAgent: string
  ) {
    const reason = comment.trim();
    if (!reason) {
      throw ApiError.badRequest("Comment is required", "COMMENT_REQUIRED");
    }

    const signRequest = await this.getSignRequest(signRequestId, tenantId);
    const signer = await this.findInternalSignerForUser(signRequestId, userId);

    if (signer.status === "signed" || signer.status === "completed") {
      throw ApiError.badRequest(
        "Báº¡n Ä‘Ã£ kÃ½ tÃ i liá»‡u nÃ y rá»“i",
        "ALREADY_SIGNED"
      );
    }

    if (signer.status === "rejected") {
      throw ApiError.badRequest(
        "Báº¡n Ä‘Ã£ tá»« chá»‘i tÃ i liá»‡u nÃ y",
        "ALREADY_REJECTED"
      );
    }

    if (signer.status !== "pending") {
      throw ApiError.badRequest(
        "ChÆ°a Ä‘áº¿n lÆ°á»£t báº¡n xá»­ lÃ½ tÃ i liá»‡u nÃ y",
        "SIGNER_NOT_ACTIVE"
      );
    }

    await signersRepository.update(signer.id, {
      status: "rejected",
      signed_at: new Date(),
      ip_address: ipAddress,
      user_agent: userAgent,
      position_data: {
        ...(typeof signer.position_data === "object" && signer.position_data ? signer.position_data as Record<string, unknown> : {}),
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    });

    await prisma.sign_requests.update({
      where: { id: signRequestId, tenant_id: tenantId },
      data: {
        status: "rejected",
        cancellation_reason: reason,
      },
    });

    await prisma.documents.update({
      where: { id: signRequest.document_id },
      data: { status: "rejected" },
    });

    await prisma.workflow_instances.updateMany({
      where: { document_id: signRequest.document_id },
      data: {
        status: "rejected",
        completed_at: new Date(),
      },
    });

    await prisma.sign_request_comments.create({
      data: {
        tenant_id: tenantId,
        sign_request_id: signRequestId,
        user_id: userId,
        body: `Tá»« chá»‘i kÃ½: ${reason}`,
      },
    });

    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign.internal_rejected",
      userId,
    });

    const document = await prisma.documents.findUnique({
      where: { id: signRequest.document_id },
      include: {
        owner: {
          select: { id: true, email: true, full_name: true },
        },
      },
    });

    const actor = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true },
    });

    if (document?.owner && document.owner.id !== userId) {
      await notificationsService.createNotification({
        tenantId,
        userId: document.owner.id,
        type: NotificationType.APPROVAL_REJECTED,
        title: "TÃ i liá»‡u bá»‹ tá»« chá»‘i kÃ½",
        message: `TÃ i liá»‡u "${document.title || signRequest.title || "Untitled"}" Ä‘Ã£ bá»‹ tá»« chá»‘i bá»Ÿi ${actor?.full_name || actor?.email || "ngÆ°á»i kÃ½"}`,
        link: `/documents/${document.id}/flow`,
      }).catch((error) => console.error("Failed to create sign rejection notification:", error));
    }

    return {
      success: true,
      message: "ÄÃ£ tá»« chá»‘i kÃ½ tÃ i liá»‡u",
      signer_id: signer.id,
      status: "rejected",
    };
  }

  async getSigners(signRequestId: number, tenantId: number) {
    await this.getSignRequest(signRequestId, tenantId);
    return signerManagementService.getSigners(signRequestId);
  }

  // ✅ Phase 2: Remove Signer
  async removeSignerFromRequest(signRequestId: number, signerId: number, tenantId: number, userId: number) {
    const signRequest = await this.ensureCanManageSignRequest(signRequestId, tenantId, userId);
    await signerManagementService.removeSignerAndReorder(signRequestId, signerId);

    // Audit log (optional - may fail if audit service has issues)
    try {
      await auditService.record({
        tenantId,
        documentId: signRequest.document_id,
        event: 'sign_request.signer_removed',
        userId,
      });
    } catch (error: unknown) {
      console.error('⚠️ Audit log failed (non-critical):', error instanceof Error ? error.message : error);
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

    const signRequest = await this.ensureCanManageSignRequest(signer.sign_request_id, tenantId, userId);
    this.ensureEditableStatus(signRequest.status);
    await signerManagementService.updateSignerRecord(signerId, signer, tenantId, updates);

    // Audit log (optional - may fail if audit service has issues)
    try {
      await auditService.record({
        tenantId,
        documentId: signRequest.document_id,
        event: 'sign_request.signer_updated',
        userId,
      });
    } catch (error: unknown) {
      console.error('⚠️ Audit log failed (non-critical):', error instanceof Error ? error.message : error);
    }

    return await signersRepository.findById(signerId);
  }

  private async syncWorkflowSnapshotAndInternalSigners(
    signRequestId: number,
    tenantId: number,
    documentId: number,
    workflowSteps: Array<{
      step_name: string;
      approver_type?: string;
      approver_id?: number | null;
      participant_role?: string;
      due_in_days?: number;
      order?: number;
    }>
  ) {
    const normalizedSteps = workflowSteps
      .map((step, index) => ({
        step_name: step.step_name?.trim() || `Bước ${index + 1}`,
        approver_type: "user",
        approver_id: step.approver_id || null,
        participant_role: step.participant_role === "signer" ? "signer" : "approver",
        due_in_days: step.due_in_days && step.due_in_days > 0 ? step.due_in_days : 3,
        order: step.order && step.order > 0 ? step.order : index + 1,
      }))
      .sort((a, b) => a.order - b.order)
      .map((step, index) => ({
        ...step,
        order: index + 1,
      }));

    for (const step of normalizedSteps) {
      if (!step.approver_id || step.approver_id <= 0) {
        throw ApiError.badRequest("Mỗi bước phải chọn đúng người phụ trách", "INVALID_WORKFLOW_STEP");
      }
    }

    const workflow = await prisma.workflows.findFirst({
      where: {
        tenant_id: tenantId,
        created_for_doc: documentId,
        is_active: true,
      },
      orderBy: { id: "desc" },
    });

    if (!workflow) {
      throw ApiError.notFound("Workflow snapshot not found", "WORKFLOW_SNAPSHOT_NOT_FOUND");
    }

    const resolvedUsers = await prisma.users.findMany({
      where: {
        tenant_id: tenantId,
        id: {
          in: normalizedSteps
            .map((step) => step.approver_id)
            .filter((approverId): approverId is number => typeof approverId === "number"),
        },
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        status: true,
      },
    });

    const userMap = new Map(resolvedUsers.map((user) => [user.id, user]));

    for (const step of normalizedSteps) {
      const user = step.approver_id ? userMap.get(step.approver_id) : null;
      if (!user || user.status !== "active") {
        throw ApiError.badRequest("Có bước đang chọn người không hợp lệ hoặc đã bị khóa", "INVALID_WORKFLOW_APPROVER");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.workflow_steps.deleteMany({
        where: { workflow_id: workflow.id },
      });

      for (const step of normalizedSteps) {
        await tx.workflow_steps.create({
          data: {
            workflow_id: workflow.id,
            step_order: step.order,
            step_name: step.step_name,
            approver_type: "user",
            approver_id: step.approver_id,
            participant_role: step.participant_role,
            due_in_days: step.due_in_days,
            is_required: true,
          },
        });
      }

      const signerSteps = normalizedSteps.filter((step) => step.participant_role === "signer");
      const signerUsers = signerSteps
        .map((step) => {
          const user = step.approver_id ? userMap.get(step.approver_id) : null;
          return user
            ? {
                id: user.id,
                email: user.email,
                name: user.full_name || user.email,
                order: step.order,
              }
            : null;
        })
        .filter((user): user is { id: number; email: string; name: string; order: number } => !!user);

      const existingInternalSigners = await tx.signers.findMany({
        where: {
          sign_request_id: signRequestId,
          is_internal: true,
        },
      });

      const signerIdsToKeep = new Set(signerUsers.map((user) => user.id));
      const signersToDelete = existingInternalSigners.filter(
        (signer) => !signer.user_id || !signerIdsToKeep.has(signer.user_id)
      );

      if (signersToDelete.length > 0) {
        const deleteIds = signersToDelete.map((signer) => signer.id);
        await tx.sign_request_fields.deleteMany({
          where: {
            sign_request_id: signRequestId,
            assigned_signer_id: { in: deleteIds },
          },
        });
        await tx.signers.deleteMany({
          where: {
            id: { in: deleteIds },
          },
        });
      }

      const existingInternalByUserId = new Map(
        existingInternalSigners
          .filter((signer) => signer.user_id)
          .map((signer) => [signer.user_id as number, signer])
      );

      for (const signerUser of signerUsers) {
        const existingSigner = existingInternalByUserId.get(signerUser.id);
        if (existingSigner) {
          await tx.signers.update({
            where: { id: existingSigner.id },
            data: {
              email: signerUser.email,
              name: signerUser.name,
              role: "signer",
              signing_order: signerUser.order,
              is_internal: true,
              user_id: signerUser.id,
              status: "draft",
            },
          });
          continue;
        }

        await tx.signers.create({
          data: {
            sign_request_id: signRequestId,
            user_id: signerUser.id,
            email: signerUser.email,
            name: signerUser.name,
            role: "signer",
            signing_order: signerUser.order,
            is_internal: true,
            status: "draft",
          },
        });
      }

      const refreshedInternalSigners = await tx.signers.findMany({
        where: {
          sign_request_id: signRequestId,
          is_internal: true,
        },
      });

      const internalMaxOrder = refreshedInternalSigners.reduce(
        (max, signer) => Math.max(max, signer.signing_order || 0),
        0
      );

      const externalSigners = await tx.signers.findMany({
        where: {
          sign_request_id: signRequestId,
          is_internal: false,
        },
        orderBy: { signing_order: "asc" },
      });

      for (let index = 0; index < externalSigners.length; index += 1) {
        await tx.signers.update({
          where: { id: externalSigners[index].id },
          data: {
            signing_order: internalMaxOrder + index + 1,
          },
        });
      }
    });
  }

  async updateDraftConfig(
    signRequestId: number,
    tenantId: number,
    userId: number,
    payload: {
      signers: Array<{
        id?: number | null;
        email: string;
        name: string;
        role?: string;
        external_org_id?: number | null;
      }>;
      workflow_steps?: Array<{
        step_name: string;
        approver_type?: string;
        approver_id?: number | null;
        participant_role?: string;
        due_in_days?: number;
        order?: number;
      }> | null;
    }
  ) {
    const signRequest = await this.ensureCanManageSignRequest(signRequestId, tenantId, userId);
    this.ensureEditableStatus(signRequest.status);

    if (payload.workflow_steps?.length) {
      await this.syncWorkflowSnapshotAndInternalSigners(
        signRequestId,
        tenantId,
        signRequest.document_id,
        payload.workflow_steps
      );
    }

    const existingSigners = await signersRepository.findBySignRequest(signRequestId);
    const externalSigners = existingSigners.filter((signer) => !signer.is_internal);
    const existingExternalById = new Map(externalSigners.map((signer) => [signer.id, signer]));
    const incomingIds = new Set(
      payload.signers
        .map((signer) => (typeof signer.id === "number" ? signer.id : null))
        .filter((id): id is number => id !== null)
    );

    for (const signer of externalSigners) {
      if (!incomingIds.has(signer.id)) {
        await prisma.sign_request_fields.deleteMany({
          where: { assigned_signer_id: signer.id },
        });
        await signersRepository.delete(signer.id);
      }
    }

    const currentSigners = await signersRepository.findBySignRequest(signRequestId);
    const internalMaxOrder = currentSigners
      .filter((signer) => signer.is_internal)
      .reduce((max, signer) => Math.max(max, signer.signing_order || 0), 0);

    for (let index = 0; index < payload.signers.length; index += 1) {
      const signerInput = payload.signers[index];
      const externalOrder = internalMaxOrder + index + 1;
      const existingSigner =
        typeof signerInput.id === "number" ? existingExternalById.get(signerInput.id) : null;

      if (existingSigner) {
        await signersRepository.update(existingSigner.id, {
          email: signerInput.email,
          name: signerInput.name,
          role: signerInput.role || "signer",
          signing_order: externalOrder,
          position_data: {
            ...(typeof existingSigner.position_data === "object" && existingSigner.position_data
              ? (existingSigner.position_data as Record<string, unknown>)
              : {}),
            external_org_id: signerInput.external_org_id || null,
          } as Prisma.InputJsonValue,
        });
        continue;
      }

      await signersRepository.create({
        sign_request: { connect: { id: signRequestId } },
        email: signerInput.email,
        name: signerInput.name,
        role: signerInput.role || "signer",
        signing_order: externalOrder,
        status: "draft",
        is_internal: false,
        position_data: signerInput.external_org_id
          ? ({
              external_org_id: signerInput.external_org_id,
            } as Prisma.InputJsonValue)
          : undefined,
      });
    }

    return this.getSignRequest(signRequestId, tenantId);
  }

  // ✅ Reorder Signers (Drag & Drop)
  async reorderSigners(
    signRequestId: number,
    tenantId: number,
    userId: number,
    signers: Array<{ id: number; signing_order: number }>
  ) {
    const signRequest = await this.ensureCanManageSignRequest(signRequestId, tenantId, userId);
    this.ensureEditableStatus(signRequest.status);
    await signerManagementService.reorderSigners(signers);

    // Audit log (optional)
    try {
      await auditService.record({
        tenantId,
        documentId: signRequest.document_id,
        event: 'sign_request.signers_reordered',
        userId,
      });
    } catch (error: unknown) {
      console.error('⚠️ Audit log failed (non-critical):', error instanceof Error ? error.message : error);
    }

    return { success: true };
  }

  /**
   * Delete sign request (draft only)
   */
  async deleteSignRequest(id: number, tenantId: number, userId: number) {
    const signRequest = await this.ensureCanManageSignRequest(id, tenantId, userId);
    await signRequestLifecycleService.deleteDraft(signRequest, id);

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
    await signRequestLifecycleService.revokeCompleted(signRequest, id, tenantId);

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
