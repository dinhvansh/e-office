import { Prisma, documents } from "@prisma/client";
import { promises as fs } from "fs";
import path from "node:path";
import crypto from "crypto";
import { ApiError } from "../../core/errors/api-error";
import { saveBase64Document } from "../../core/utils/fileStorage";
import { readStoredFile } from "../../core/storage/fileStorage";
import { storageService } from "../../core/storage/storage.service";
import { auditService } from "../audit/audit.service";
import { licenseService } from "../licenses/license.service";
import { numberingService } from "../numbering/numbering.service";
import { prisma } from "../../config/prisma";
import { CreateDocumentData, documentsRepository } from "./documents.repository";
import { authorizationService } from "../authorization/authorization.service";
import { documentQueriesService } from "./documentQueries.service";
import { canCancelDocumentStatus, canHardDeleteDocumentStatus } from "./documentLifecycle.policy";
import { workflowStateService } from "../workflows/workflowState.service";
import { documentWorkflowOrchestratorService } from "./documentWorkflowOrchestrator.service";
import { permissionsService } from "./permissions.service";
import {
  canCreateFromDocumentTypePolicy,
  DocumentTypePolicyV2,
  mapSecurityLevelToDocumentConfidentialLevel,
  normalizeDocumentTypePolicyV2,
} from "../settings/document-type-policy.helper";
import {
  applyWatermarkToPdfBytes,
  getTenantWatermarkConfig,
  resolveWatermarkVariantForStatus,
} from "../settings/watermark.helper";

export interface CreateDocumentInput {
  fileName: string;
  base64?: string;
  storagePath?: string;
  documentTypeId?: number;
  departmentId?: number;
  title?: string;
  summary?: string;
  priorityLevel?: string;
  confidentialLevel?: string;
  visibilityScope?: string;
  workflowId?: number;
  signers?: Array<{
    email: string;
    name: string;
    order: number;
    type: 'manual' | 'external';
    external_org_id?: number;
  }>;
  ccEmails?: string[];
  attachments?: Array<{
    file_name: string;
    file_base64: string;
    file_type: string;
  }>;
  detailPermissions?: Array<{
    subject_type: 'user' | 'department' | 'position_in_department';
    subject_id: number;
    scope_department_id?: number;
    scope?: string;
    permissions_json?: string[] | null;
    status_limit_json?: string[] | null;
    can_read?: boolean;
    can_edit?: boolean;
    can_approve?: boolean;
    can_share?: boolean;
    can_delete?: boolean;
  }>;
  forceSignRequest?: boolean;
}

class DocumentsService {
  private async resolveDocumentTypeDefaults(
    tenantId: number,
    documentTypeId: number | null | undefined,
    ownerId: number
  ): Promise<{
    visibilityScope?: string;
    confidentialLevel?: string;
    departmentId?: number | null;
    policy?: DocumentTypePolicyV2;
  }> {
    if (!documentTypeId) {
      return {};
    }

    const setting = await prisma.tenant_settings.findFirst({
      where: {
        tenant_id: tenantId,
        setting_key: `doc_type_policy:${documentTypeId}`,
      },
      select: { setting_value: true },
    });

    const policy = normalizeDocumentTypePolicyV2(setting?.setting_value || {});

    let departmentId: number | null | undefined = undefined;
    if (policy.visibility.auto_assign_creator_department) {
      const owner = await prisma.users.findUnique({
        where: { id: ownerId },
        select: { department_id: true },
      });
      departmentId = owner?.department_id ?? null;
    }

    return {
      visibilityScope: policy.visibility.force_private_on_create
        ? "private"
        : policy.visibility.default_visibility_scope,
      confidentialLevel: mapSecurityLevelToDocumentConfidentialLevel(
        policy.visibility.default_security_level
      ),
      departmentId,
      policy,
    };
  }

  private async snapshotAclTemplatesToDocument(
    tenantId: number,
    ownerId: number,
    documentId: number,
    policy: DocumentTypePolicyV2 | undefined
  ) {
    if (!policy) return;

    const owner = await prisma.users.findUnique({
      where: { id: ownerId },
      select: { department_id: true, manager_id: true },
    });

    for (const template of policy.acl_templates.filter((item) => item.is_active)) {
      const permissions = new Set(template.permissions);
      const basePermission = {
        permission_source: "baseline" as const,
        scope: template.scope ?? null,
        permissions_json: template.permissions,
        status_limit_json: template.status_limit ?? null,
        can_read: permissions.has("VIEW") || permissions.has("DOWNLOAD"),
        can_edit: permissions.has("EDIT"),
        can_approve: permissions.has("APPROVE"),
        can_share: permissions.has("SHARE"),
        can_delete: permissions.has("DELETE"),
      };

      const grants: Array<{
        subject_type: "user" | "department" | "position_in_department" | "role";
        subject_id: number;
        scope_department_id?: number;
      }> = [];

      switch (template.subject_type) {
        case "creator":
          grants.push({ subject_type: "user", subject_id: ownerId });
          break;
        case "creator_department":
          if (owner?.department_id) {
            grants.push({ subject_type: "department", subject_id: owner.department_id });
          }
          break;
        case "creator_manager":
          if (owner?.manager_id) {
            grants.push({ subject_type: "user", subject_id: owner.manager_id });
          }
          break;
        case "specific_department":
          if (template.subject_id) {
            grants.push({ subject_type: "department", subject_id: template.subject_id });
          }
          break;
        case "specific_role":
          if (template.subject_id) {
            grants.push({ subject_type: "role", subject_id: template.subject_id });
          }
          break;
        case "specific_user":
          if (template.subject_id) {
            grants.push({ subject_type: "user", subject_id: template.subject_id });
          }
          break;
        case "legacy_position_in_department":
          if (template.subject_id && template.scope_department_id) {
            grants.push({
              subject_type: "position_in_department",
              subject_id: template.subject_id,
              scope_department_id: template.scope_department_id,
            });
          }
          break;
        case "workflow_participant":
        case "cc_user":
          continue;
      }

      for (const grant of grants) {
        await permissionsService.grantPermission(
          documentId,
          {
            ...grant,
            ...basePermission,
          },
          ownerId,
          tenantId
        );
      }
    }
  }

  async listDocuments(tenantId: number, userId?: number, noSigningOnly = false): Promise<documents[]> {
    return documentQueriesService.listDocuments(tenantId, userId, noSigningOnly);
  }

  async listDocumentsPaginated(
    tenantId: number,
    userId: number | undefined,
    page: number = 1,
    limit: number = 10,
    noSigningOnly = false,
    status?: string,
    search?: string,
    documentTypeId?: number,
    confidentialLevel?: string
  ) {
    return documentQueriesService.listDocumentsPaginated(tenantId, userId, page, limit, noSigningOnly, status, search, documentTypeId, confidentialLevel);
  }

  async getDocument(documentId: number, tenantId: number, userId?: number): Promise<documents> {
    return documentQueriesService.getDocument(documentId, tenantId, userId);
  }

  async listAttachments(documentId: number, tenantId: number, userId: number) {
    await this.getDocument(documentId, tenantId, userId);

    return prisma.document_attachments.findMany({
      where: {
        document_id: documentId,
        document: { tenant_id: tenantId },
      },
      orderBy: { uploaded_at: "desc" },
    });
  }

  async addAttachment(
    documentId: number,
    tenantId: number,
    userId: number,
    input: { file_name: string; file_base64: string; file_type?: string | null },
  ) {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    const readDecision = await authorizationService.canAccessDocument(userId, tenantId, documentId, "read");
    if (!readDecision.allowed) {
      throw ApiError.forbidden("You do not have access to this document", "DOCUMENT_ACCESS_DENIED");
    }

    const editDecision = await authorizationService.canAccessDocument(userId, tenantId, documentId, "edit");
    const participant = await prisma.users.findFirst({
      where: { id: userId, tenant_id: tenantId },
      select: { email: true },
    }).then(async (user) => {
      if (!user) return false;
      const [approval, signer] = await Promise.all([
        prisma.document_approvals.findFirst({
          where: { document_id: documentId, approver_user_id: userId },
          select: { id: true },
        }),
        prisma.signers.findFirst({
          where: {
            sign_request: { document_id: documentId },
            OR: [{ user_id: userId }, { email: user.email }],
          },
          select: { id: true },
        }),
      ]);
      return !!approval || !!signer;
    });

    if (!editDecision.allowed && document.owner_id !== userId && !participant) {
      throw ApiError.forbidden("You do not have permission to add attachments", "DOCUMENT_ATTACHMENT_DENIED");
    }

    const buffer = Buffer.from(input.file_base64, "base64");
    if (buffer.length === 0) {
      throw ApiError.badRequest("Attachment file is empty", "ATTACHMENT_EMPTY");
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw ApiError.badRequest("Attachment must be 10MB or less", "ATTACHMENT_TOO_LARGE");
    }

    const attachmentPath = await saveBase64Document(tenantId, input.file_name, input.file_base64);
    const attachment = await prisma.document_attachments.create({
      data: {
        document_id: documentId,
        file_name: input.file_name,
        file_path: attachmentPath,
        file_size: BigInt(buffer.length),
        file_type: input.file_type || null,
      },
    });

    await auditService.record({
      tenantId,
      documentId,
      event: "document.attachment_added",
      userId,
    });

    return attachment;
  }

  async syncCCEmails(documentId: number, tenantId: number, userId: number, emails: string[]) {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    const editDecision = await authorizationService.canAccessDocument(userId, tenantId, documentId, "edit");
    if (!editDecision.allowed && document.owner_id !== userId) {
      throw ApiError.forbidden("You do not have permission to update CC emails", "DOCUMENT_CC_EDIT_DENIED");
    }

    const normalizedEmails = Array.from(
      new Set(
        emails
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const existingEntries = await prisma.document_cc_emails.findMany({
      where: { document_id: documentId },
      orderBy: { created_at: "asc" },
    });
    const existingSet = new Set(existingEntries.map((entry) => entry.email.toLowerCase()));
    const targetSet = new Set(normalizedEmails);

    const toDelete = existingEntries.filter((entry) => !targetSet.has(entry.email.toLowerCase()));
    if (toDelete.length > 0) {
      await prisma.document_cc_emails.deleteMany({
        where: { id: { in: toDelete.map((entry) => entry.id) } },
      });
    }

    const owner = await prisma.users.findUnique({
      where: { id: document.owner_id || userId },
      select: { full_name: true, email: true },
    });

    for (const email of normalizedEmails) {
      if (existingSet.has(email)) continue;

      await prisma.document_cc_emails.create({
        data: {
          document_id: documentId,
          email,
          sent_at: new Date(),
        },
      });

      try {
        const { emailService } = await import('../common/email.service');
        await emailService.sendDocumentSharedEmail({
          recipientEmail: email,
          documentTitle: document.title || document.original_file_name || 'Untitled',
          documentNumber: document.document_number || undefined,
          senderName: owner?.full_name || owner?.email || 'System',
          documentUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${document.id}`,
        });
      } catch (error) {
        console.error(`Failed to send CC email to ${email}:`, error);
      }
    }

    await auditService.record({
      tenantId,
      documentId,
      event: "document.cc_updated",
      userId,
    });

    return prisma.document_cc_emails.findMany({
      where: { document_id: documentId },
      orderBy: { created_at: "asc" },
    });
  }

  async getAttachmentFile(attachmentId: number, tenantId: number, userId: number) {
    const attachment = await prisma.document_attachments.findFirst({
      where: {
        id: attachmentId,
        document: { tenant_id: tenantId },
      },
      include: { document: { select: { id: true } } },
    });

    if (!attachment) {
      throw ApiError.notFound("Attachment not found", "ATTACHMENT_NOT_FOUND");
    }

    const decision = await authorizationService.canAccessDocument(userId, tenantId, attachment.document.id, "read");
    if (!decision.allowed) {
      throw ApiError.forbidden("You do not have access to this attachment", "ATTACHMENT_ACCESS_DENIED");
    }

    try {
      const fileBytes = path.isAbsolute(attachment.file_path)
        ? await fs.readFile(attachment.file_path)
        : await readStoredFile(storageService, attachment.file_path);
      return {
        fileBytes: Buffer.from(fileBytes),
        fileName: attachment.file_name,
        mimeType: attachment.file_type,
      };
    } catch {
      throw ApiError.notFound("Attachment file not found on disk", "ATTACHMENT_FILE_NOT_FOUND");
    }
  }

  async createDocument(input: CreateDocumentInput & {
    adhocSteps?: Array<{ approver_user_id: number; due_in_days: number }>;
    customizedSteps?: Array<{
      step_name?: string;
      approver_type: string;
      approver_id: number;
      participant_role?: string; // ✅ Add participant_role
      due_in_days: number;
      order?: number; // ✅ Add order field
    }>;
  }, tenantId: number, ownerId: number, requesterIp?: string, userAgent?: string) {
    if (!input.base64 && !input.storagePath) {
      throw ApiError.badRequest("Either base64 or storagePath must be provided", "DOCUMENT_PAYLOAD_REQUIRED");
    }
    await licenseService.enforceDocumentLimit(tenantId);
    let filePath: string;
    let hash: string;
    if (input.base64) {
      const buffer = Buffer.from(input.base64, "base64");
      hash = crypto.createHash("sha256").update(buffer).digest("hex");
      filePath = await saveBase64Document(tenantId, input.fileName, input.base64);
    } else {
      // Security: Validate storage_path to prevent Local File Read (LFR) attacks
      const storagePath = input.storagePath!;
      
      // Check for path traversal attempts
      if (storagePath.includes('..') || storagePath.includes('~')) {
        throw ApiError.badRequest("Invalid storage path: path traversal detected", "INVALID_STORAGE_PATH");
      }
      
      // Object keys are portable across local and S3-compatible backends.
      if (!storagePath.replace(/\\/g, "/").startsWith("storage/")) {
        throw ApiError.badRequest("Invalid storage path: must be within storage directory", "INVALID_STORAGE_PATH");
      }
      
      filePath = storagePath;
      const buffer = await readStoredFile(storageService, filePath);
      hash = crypto.createHash("sha256").update(buffer).digest("hex");
    }

    // Handle document type and numbering
    let documentTypeId: number | null = null;
    let documentNumber: string | null = null;
    let numberingRuleId: number | null = null;
    let documentType: Prisma.document_typesGetPayload<{ include: { default_workflow: true } }> | null = null;

    if (input.documentTypeId) {
      // Load document type with workflow settings
      documentType = await prisma.document_types.findFirst({
        where: {
          id: input.documentTypeId,
          tenant_id: tenantId,
          is_active: true,
        },
        include: {
          default_workflow: true,
        },
      });

      if (!documentType) {
        throw ApiError.notFound("Document type not found", "DOCUMENT_TYPE_NOT_FOUND");
      }

      documentTypeId = documentType.id;

      // Generate document number if required
      if (documentType.require_numbering) {
        try {
          const result = await numberingService.generateNumberForDocument(tenantId, documentType.id);
          documentNumber = result.documentNumber;
          numberingRuleId = result.ruleId;
        } catch (error) {
          throw ApiError.badRequest(
            "Numbering rule not configured for this document type",
            "NUMBERING_RULE_NOT_CONFIGURED"
          );
        }
      }
    }

    const shouldCreateSignRequest =
      !!input.forceSignRequest ||
      !!documentType?.require_digital_signing ||
      !!(input.signers && input.signers.length > 0);

    const initialStatus =
      documentType?.require_approval || shouldCreateSignRequest ? "draft" : "active";

    const documentTypeDefaults = await this.resolveDocumentTypeDefaults(
      tenantId,
      documentTypeId,
      ownerId
    );

    if (documentTypeId && documentTypeDefaults.policy) {
      const owner = await prisma.users.findUnique({
        where: { id: ownerId },
        include: { user_roles: true },
      });

      if (
        owner &&
        owner.tenant_id === tenantId &&
        !canCreateFromDocumentTypePolicy(documentTypeDefaults.policy, owner)
      ) {
        throw ApiError.forbidden(
          "Bạn không có quyền tạo tài liệu từ loại văn bản này",
          "DOCUMENT_TYPE_CREATE_DENIED"
        );
      }
    }

    const payload: CreateDocumentData = {
      tenant_id: tenantId,
      owner_id: ownerId,
      file_path: filePath,
      original_file_name: input.fileName,
      hash,
      status: initialStatus,
      document_type_id: documentTypeId,
      document_number: documentNumber,
      numbering_rule_id: numberingRuleId,
      title: input.title,
      summary: input.summary,
      priority_level: input.priorityLevel,
      confidential_level: input.confidentialLevel ?? documentTypeDefaults.confidentialLevel,
      visibility_scope:
        documentTypeDefaults.policy?.visibility.force_private_on_create
          ? "private"
          : input.visibilityScope ?? documentTypeDefaults.visibilityScope,
      department_id: input.departmentId ?? documentTypeDefaults.departmentId,
    };
    const document = await documentsRepository.create(payload);
    const createdAttachmentPaths: string[] = [];

    try {
    if (input.detailPermissions && input.detailPermissions.length > 0) {
      for (const permission of input.detailPermissions) {
        await permissionsService.grantPermission(
          document.id,
          {
            permission_source: "baseline",
            subject_type: permission.subject_type,
            subject_id: permission.subject_id,
            scope_department_id: permission.scope_department_id,
            scope: permission.scope,
            permissions_json: permission.permissions_json ?? null,
            status_limit_json: permission.status_limit_json ?? null,
            can_read: permission.can_read,
            can_edit: permission.can_edit,
            can_approve: permission.can_approve,
            can_share: permission.can_share,
            can_delete: permission.can_delete,
          },
          ownerId,
          tenantId
        );
      }
    } else {
      await this.snapshotAclTemplatesToDocument(
        tenantId,
        ownerId,
        document.id,
        documentTypeDefaults.policy
      );
    }
    
    if (shouldCreateSignRequest) {
        await documentWorkflowOrchestratorService.prepareDraftPackage({
          documentId: document.id,
          tenantId,
          ownerId,
          documentTitle: document.title,
          documentFileName: document.original_file_name,
          workflowId: input.workflowId,
          signers: input.signers,
          customizedSteps: input.customizedSteps,
          adhocSteps: input.adhocSteps,
          documentType: documentType
            ? {
                default_workflow_id: documentType.default_workflow_id,
                require_approval: documentType.require_approval,
              }
            : null,
        });
    }
    
    // ✅ Save CC emails if provided
    if (input.ccEmails && input.ccEmails.length > 0) {
      const owner = await prisma.users.findUnique({
        where: { id: ownerId },
        select: { full_name: true, email: true }
      });

      for (const email of input.ccEmails) {
        await prisma.document_cc_emails.create({
          data: {
            document_id: document.id,
            email,
            sent_at: new Date(),
          },
        });

        // Send notification email to CC
        try {
          const { emailService } = await import('../common/email.service');
          await emailService.sendDocumentSharedEmail({
            recipientEmail: email,
            documentTitle: input.title || input.fileName,
            documentNumber: document.document_number || undefined,
            senderName: owner?.full_name || owner?.email || 'System',
            documentUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${document.id}`,
          });
        } catch (error) {
          console.error(`Failed to send CC email to ${email}:`, error);
          // Don't fail the whole operation if email fails
        }
      }
    }
    
    // ✅ Save attachments if provided
    if (input.attachments && input.attachments.length > 0) {
      for (const attachment of input.attachments) {
        const attachmentPath = await saveBase64Document(
          tenantId,
          attachment.file_name,
          attachment.file_base64
        );
        createdAttachmentPaths.push(attachmentPath);
        
        const buffer = Buffer.from(attachment.file_base64, 'base64');
        const fileSize = buffer.length;
        
        await prisma.document_attachments.create({
          data: {
            document_id: document.id,
            file_name: attachment.file_name,
            file_path: attachmentPath,
            file_size: BigInt(fileSize),
            file_type: attachment.file_type,
          },
        });
      }
    }
    } catch (error) {
      // Document, ACL, workflow package, CC and attachment persistence span
      // services with their own transactions. Compensate as one creation unit
      // so a later failure cannot leave a partial draft package behind.
      await this.deleteDocument(document.id, tenantId, ownerId).catch(() => undefined);
      const cleanupPaths = [
        ...(input.base64 ? [filePath] : []),
        ...createdAttachmentPaths,
      ];
      await Promise.all(cleanupPaths.map((key) => storageService.delete(key).catch(() => undefined)));
      throw error;
    }
    
    await auditService.record({
      tenantId,
      documentId: document.id,
      event: "document.uploaded",
      userId: ownerId,
      ip: requesterIp,
      ua: userAgent,
    });

    // NOTE: Workflow auto-submit removed - user must manually click "Trình duyệt"
    // This allows time to add sign fields before submitting for approval
    
    // Handle workflow based on 4 modes - DISABLED FOR NOW
    // User will manually submit via submitForApproval() method
    /*
    if (documentType && documentType.require_approval) {
      const { approvalsService } = await import('../approvals/approvals.service');

      // Mode 4: Ad-hoc (No default workflow)
      if (!documentType.default_workflow_id) {
        if (!input.adhocSteps || input.adhocSteps.length === 0) {
          throw ApiError.badRequest(
            'Loại văn bản này yêu cầu tạo luồng ký thủ công',
            'AD_HOC_STEPS_REQUIRED'
          );
        }

        const workflow = await this.createAdhocWorkflow(
          input.adhocSteps,
          document.id,
          tenantId,
          ownerId
        );

        await approvalsService.submitForApproval(
          document.id,
          workflow.id,
          tenantId,
          ownerId
        );

        // Refresh document to get updated status
        return await documentsRepository.findById(document.id, tenantId) || document;
      }

      // Mode 2: Strict (Use template as-is)
      if (!documentType.allow_workflow_override) {
        await approvalsService.submitForApproval(
          document.id,
          documentType.default_workflow_id,
          tenantId,
          ownerId
        );

        // Refresh document to get updated status
        return await documentsRepository.findById(document.id, tenantId) || document;
      }

      // Mode 3: Flexible (Use customized or default)
      if (input.customizedSteps && input.customizedSteps.length > 0) {
        const workflow = await this.createCustomizedWorkflow(
          documentType.default_workflow_id,
          input.customizedSteps,
          document.id,
          tenantId,
          ownerId
        );

        await approvalsService.submitForApproval(
          document.id,
          workflow.id,
          tenantId,
          ownerId
        );
      } else {
        // Use default template
        await approvalsService.submitForApproval(
          document.id,
          documentType.default_workflow_id,
          tenantId,
          ownerId
        );
      }
    }
    */

    return await documentsRepository.findById(document.id, tenantId) || document;
  }

  async deleteDocument(documentId: number, tenantId: number, userId?: number): Promise<void> {
    const document = await this.getDocument(documentId, tenantId);
    
    // ✅ Status check: Only allow delete for 'draft' or 'cancelled' status
    if (!canHardDeleteDocumentStatus(document.status)) {
      throw ApiError.badRequest(
        `Không thể xóa tài liệu đang ở trạng thái "${document.status}". Chỉ có thể xóa tài liệu ở trạng thái "Nháp" hoặc "Đã hủy". Vui lòng hủy luồng ký/phê duyệt trước khi xóa.`,
        "DOCUMENT_DELETE_DENIED_STATUS"
      );
    }
    
    // ✅ Check sign request status if exists
    if (document.sign_request_id) {
      const signRequest = await prisma.sign_requests.findUnique({
        where: { id: document.sign_request_id },
        include: { signers: true }
      });
      
      if (signRequest && signRequest.status === 'pending') {
        throw ApiError.badRequest(
          "Tài liệu đang có luồng ký đang chờ xử lý. Vui lòng hủy luồng ký trước khi xóa tài liệu.",
          "DOCUMENT_HAS_PENDING_SIGNATURES"
        );
      }
    }
    
    // Authorization check: owner/admin/explicit policy with deny precedence
    if (userId) {
      const decision = await authorizationService.canAccessDocument(userId, tenantId, documentId, "delete");
      if (!decision.allowed) {
        throw ApiError.forbidden("You can only delete allowed documents", "DOCUMENT_DELETE_DENIED");
      }
    }
    
    // Database runtime records are deleted atomically. Files are intentionally
    // not removed here; storage cleanup must remain retryable/outside the DB transaction.
    await prisma.$transaction(async (tx) => {
      await tx.audit_logs.deleteMany({ where: { document_id: document.id } });

      if (document.sign_request_id) {
        await tx.sign_request_field_values.deleteMany({
          where: { field: { sign_request_id: document.sign_request_id } },
        });
        await tx.sign_request_fields.deleteMany({ where: { sign_request_id: document.sign_request_id } });
        await tx.signers.deleteMany({ where: { sign_request_id: document.sign_request_id } });
        await tx.sign_requests.delete({ where: { id: document.sign_request_id } });
      }

      const workflowInstance = await tx.workflow_instances.findUnique({ where: { document_id: document.id } });
      if (workflowInstance) {
        await tx.document_approvals.deleteMany({ where: { document_id: document.id } });
        await tx.workflow_instances.delete({ where: { document_id: document.id } });
      }

      await documentsRepository.delete(document.id, tx);
    });
    
    // Note: Cannot record audit log after deletion since document_id is required
    // and the document no longer exists
  }

  /**
   * Create ad-hoc workflow from user-provided steps
   */
  async createAdhocWorkflow(
    steps: Array<{ approver_user_id: number; due_in_days: number }>,
    documentId: number,
    tenantId: number,
    userId: number
  ) {
    // Validate steps
    if (!steps || steps.length === 0) {
      throw ApiError.badRequest('Phải có ít nhất 1 bước phê duyệt', 'AD_HOC_STEPS_REQUIRED');
    }

    if (steps.length > 10) {
      throw ApiError.badRequest('Tối đa 10 bước', 'TOO_MANY_STEPS');
    }

    // Validate approvers exist and belong to tenant
    for (const step of steps) {
      const user = await prisma.users.findFirst({
        where: {
          id: step.approver_user_id,
          tenant_id: tenantId,
        },
      });

      if (!user) {
        throw ApiError.badRequest('Người phê duyệt không hợp lệ', 'INVALID_APPROVER');
      }

      if (step.due_in_days < 1 || step.due_in_days > 365) {
        throw ApiError.badRequest('Thời hạn phải từ 1-365 ngày', 'INVALID_DUE_DAYS');
      }
    }

    // Create ad-hoc workflow
    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `Ad-hoc workflow for Document #${documentId}`,
        description: 'User-created workflow',
        is_template: false,
        created_for_doc: documentId,
        created_by: userId,
        is_active: true,
      },
    });

    // Create workflow steps
    for (let i = 0; i < steps.length; i++) {
      await prisma.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: i + 1,
          step_name: `Bước ${i + 1}`,
          approver_type: 'user',
          approver_id: steps[i].approver_user_id,
          assignee_type: 'specific_user',
          assignee_user_id: steps[i].approver_user_id,
          completion_mode: 'all',
          due_in_days: steps[i].due_in_days,
          is_required: true,
        },
      });
    }

    return workflow;
  }

  /**
   * Create customized workflow based on template
   */
  async createCustomizedWorkflow(
    templateId: number,
    customSteps: Array<{
      step_name?: string;
      approver_type: string;
      approver_id: number;
      participant_role?: string; // ✅ Add participant_role
      due_in_days: number;
      order?: number; // ✅ Add order field
    }>,
    documentId: number,
    tenantId: number,
    userId: number
  ) {
    // Get template
    const template = await prisma.workflows.findFirst({
      where: {
        id: templateId,
        tenant_id: tenantId,
        is_template: true,
      },
    });

    if (!template) {
      throw ApiError.notFound('Workflow template không tồn tại', 'TEMPLATE_NOT_FOUND');
    }

    // Validate custom steps
    if (!customSteps || customSteps.length === 0) {
      throw ApiError.badRequest('Phải có ít nhất 1 bước', 'CUSTOM_STEPS_REQUIRED');
    }

    // Create customized workflow
    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `${template.name} (Tùy chỉnh cho #${documentId})`,
        description: `Customized from: ${template.name}`,
        is_template: false,
        created_for_doc: documentId,
        based_on_template: templateId,
        created_by: userId,
        is_active: true,
      },
    });

    // Create custom steps
    for (let i = 0; i < customSteps.length; i++) {
      await prisma.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: customSteps[i].order || (i + 1), // ✅ Use custom order if provided
          step_name: customSteps[i].step_name || `Bước ${i + 1}`,
          approver_type: customSteps[i].approver_type,
          approver_id: customSteps[i].approver_id,
          participant_role: customSteps[i].participant_role || 'approver', // ✅ Add participant_role
          due_in_days: customSteps[i].due_in_days,
          is_required: true,
        },
      });
    }

    // ✅ Reload workflow with steps to return complete object
    const workflowWithSteps = await prisma.workflows.findUnique({
      where: { id: workflow.id },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    return workflowWithSteps!;
  }

  async cloneWorkflowForDocument(
    templateId: number,
    documentId: number,
    tenantId: number,
    userId: number
  ) {
    const template = await prisma.workflows.findFirst({
      where: {
        id: templateId,
        tenant_id: tenantId,
        is_active: true,
      },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    if (!template) {
      throw ApiError.notFound('Workflow not found', 'WORKFLOW_NOT_FOUND');
    }

    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `${template.name} (Document #${documentId})`,
        description: template.description,
        document_type_id: template.document_type_id,
        is_template: false,
        created_for_doc: documentId,
        based_on_template: template.is_template ? template.id : template.based_on_template || template.id,
        created_by: userId,
        is_active: true,
      }
    });

    for (const step of template.steps) {
      await prisma.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: step.step_order,
          step_name: step.step_name,
          approver_type: step.approver_type,
          approver_id: step.approver_id,
          assignee_type: step.assignee_type,
          assignee_user_id: step.assignee_user_id,
          assignee_department_id: step.assignee_department_id,
          assignee_position_id: step.assignee_position_id,
          completion_mode: step.completion_mode,
          min_required: step.min_required,
          participant_role: step.participant_role,
          due_in_days: step.due_in_days,
          is_required: step.is_required,
          is_parallel: step.is_parallel,
          conditions: step.conditions as Prisma.InputJsonValue,
        }
      });
    }

    return prisma.workflows.findUnique({
      where: { id: workflow.id },
      include: {
        steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });
  }

  async getDocumentFile(documentId: number, tenantId: number, userId?: number): Promise<{
      fileBytes: Buffer;
      fileName: string;
      mimeType: string;
      documentStatus: string | null;
      tenantId: number;
    }> {
    const document = await this.getDocument(documentId, tenantId, userId);
    
    // Handle different path formats:
    // 1. "storage/1/file.pdf" -> resolve from cwd
    // 2. "/uploads/file.pdf" -> resolve from backend/ (legacy seed data)
    // 3. Absolute paths -> use as-is
    if (document.file_path.startsWith('/uploads/')) {
      // Legacy seed data - files don't exist
      throw ApiError.notFound("File not found (seed data)", "FILE_NOT_FOUND");
    }
    
    // ✅ Create meaningful filename for download (original file)
    // Format: [DocumentNumber]_[Title]_Original.pdf
    
    const docNumber = document.document_number || `DOC-${document.id}`;
    const title = document.title || document.original_file_name.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Sanitize filename
    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const ext = path.extname(document.file_path);
    const fileName = `${docNumber}_${sanitizedTitle}_Original${ext}`;
    
    // Determine mime type from extension
    const extLower = ext.toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    };
    
    const mimeType = mimeTypes[extLower] || 'application/octet-stream';
    
    // Check if file exists
    try {
      const fileBytes = path.isAbsolute(document.file_path)
        ? await fs.readFile(document.file_path)
        : await readStoredFile(storageService, document.file_path);
      return { fileBytes: Buffer.from(fileBytes), fileName, mimeType, documentStatus: document.status || null, tenantId: document.tenant_id };
    } catch (error) {
      throw ApiError.notFound("File not found on disk", "FILE_NOT_FOUND");
    }
    }

  async getSignedDocumentFile(documentId: number, tenantId: number, userId?: number): Promise<{
      fileBytes: Buffer;
      fileName: string;
      mimeType: string;
      documentStatus: string | null;
      tenantId: number;
    }> {
    const document = await this.getDocument(documentId, tenantId, userId);
    
    // Check if signed file exists
    if (!document.signed_file_path) {
      throw ApiError.notFound("Signed file not available", "SIGNED_FILE_NOT_FOUND");
    }
    
    // ✅ Create meaningful filename for download
    // Format: [DocumentNumber]_[Title]_[Status].pdf
    // Example: 027-2025_Giay-De-Nghi_Signed.pdf or 027-2025_Giay-De-Nghi_Draft.pdf
    
    const docNumber = document.document_number || `DOC-${document.id}`;
    const title = document.title || document.original_file_name.replace('.pdf', '');
    const status = document.status === 'completed' ? 'Signed' : 'Draft';
    
    // Sanitize filename (remove special chars, limit length)
    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
      .replace(/\s+/g, '-')               // Replace spaces with dash
      .substring(0, 50);                  // Limit length
    
    const fileName = `${docNumber}_${sanitizedTitle}_${status}.pdf`;
    
    // Signed files are always PDF
    const mimeType = 'application/pdf';
    
    // Check if file exists
    try {
      const fileBytes = path.isAbsolute(document.signed_file_path)
        ? await fs.readFile(document.signed_file_path)
        : await readStoredFile(storageService, document.signed_file_path);
      return { fileBytes: Buffer.from(fileBytes), fileName, mimeType, documentStatus: document.status || null, tenantId: document.tenant_id };
    } catch (error) {
      throw ApiError.notFound("Signed file not found on disk", "FILE_NOT_FOUND");
    }
    }

  async getWatermarkedDocumentBufferIfNeeded(input: {
    fileBytes: Uint8Array;
    mimeType: string;
    documentStatus: string | null;
    tenantId: number;
  }): Promise<Buffer | null> {
    if (input.mimeType !== 'application/pdf') {
      return null;
    }

    const config = await getTenantWatermarkConfig(input.tenantId);
    const variant = resolveWatermarkVariantForStatus(config, input.documentStatus);
    if (!variant) {
      return null;
    }

    const watermarkedBytes = await applyWatermarkToPdfBytes(input.fileBytes, config, variant);
    return Buffer.from(watermarkedBytes);
  }

  /**
   * Submit document for approval
   */
  async submitForApproval(documentId: number, tenantId: number, userId: number, workflowId?: number) {
    const document = await this.getDocument(documentId, tenantId, userId);
    
    // Validate status
    if (document.status !== 'draft') {
      throw ApiError.badRequest('Document must be in draft status', 'INVALID_STATUS');
    }
    
    // Get document type
    const documentType = await prisma.document_types.findUnique({
      where: { id: document.document_type_id! },
    });
    
    if (!documentType?.require_approval) {
      throw ApiError.badRequest('This document type does not require approval', 'APPROVAL_NOT_REQUIRED');
    }
    
    // If document has sign request, validate fields
    if (document.sign_request_id) {
      const { signRequestFieldsService } = await import('../signRequests/signRequestFields.service');
      const validation = await signRequestFieldsService.validateFieldsBeforeSend(document.sign_request_id);
      if (!validation.valid) {
        throw ApiError.badRequest(validation.message || 'Sign fields validation failed', 'SIGN_FIELDS_INVALID');
      }
    }
    
    // Determine workflow
    const finalWorkflowId = workflowId || documentType.default_workflow_id;
    
    if (finalWorkflowId) {
      // Has workflow - submit for approval
      const { approvalsService } = await import('../approvals/approvals.service');
      await approvalsService.submitForApproval(documentId, finalWorkflowId, tenantId, userId);
      
      // Update status
      await documentsRepository.update(documentId, {
        status: 'pending_approval',
      });
    } else {
      // No workflow - direct approve (simple approval without workflow)
      // Just mark as approved
      await documentsRepository.update(documentId, {
        status: 'approved',
      });
    }
    
    return await this.getDocument(documentId, tenantId, userId);
  }

  async archiveDocument(documentId: number, tenantId: number, userId: number): Promise<void> {
    const document = await this.getDocument(documentId, tenantId, userId);
    
    if (document.status !== 'completed') {
      throw ApiError.badRequest('Only completed documents can be archived', 'DOCUMENT_NOT_COMPLETED');
    }
    
    await prisma.documents.update({
      where: { id: documentId },
      data: { status: 'archived' }
    });
  }

  async cancelDocument(documentId: number, tenantId: number, userId: number): Promise<void> {
    const document = await this.getDocument(documentId, tenantId, userId);

    if (!canCancelDocumentStatus(document.status)) {
      throw ApiError.badRequest('Only active workflow documents can be cancelled', 'DOCUMENT_CANCEL_DENIED');
    }

    await prisma.$transaction(async (tx) => {
      if (document.sign_request_id) {
        await workflowStateService.transitionSigningPair(tx, {
          documentId,
          signRequestId: document.sign_request_id,
          documentStatus: "cancelled",
          signRequestStatus: "cancelled",
        });
        await tx.signers.updateMany({
          where: { sign_request_id: document.sign_request_id, status: { in: ["pending", "waiting_approval", "waiting_signing", "otp_sent"] } },
          data: { status: "cancelled" },
        });
      } else {
        await workflowStateService.transitionDocument(tx, { documentId, status: "cancelled" });
      }
      await tx.workflow_instances.updateMany({ where: { document_id: documentId, status: { notIn: ["completed", "cancelled"] } }, data: { status: "cancelled", completed_at: new Date() } });
      await tx.audit_logs.create({ data: { document_id: documentId, event: "document.cancelled", user_id: userId, ip: null, ua: null } });
    });
  }
}

export const documentsService = new DocumentsService();
