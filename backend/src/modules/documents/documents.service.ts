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
import { getDocumentDeleteDisposition } from "./documentLifecycle.policy";
import { documentWorkflowOrchestratorService } from "./documentWorkflowOrchestrator.service";
import { permissionsService } from "./permissions.service";
import {
  canCreateFromDocumentTypePolicy,
  DocumentTypePolicyV2,
  mapSecurityLevelToDocumentConfidentialLevel,
  normalizeDocumentTypePolicyV2,
} from "../settings/document-type-policy.helper";
import { documentFileService, type DocumentFileResult } from "./documentFile.service";
import { documentLifecycleService } from "./documentLifecycle.service";
import { outboxDeliveryService } from "../outbox/outboxDelivery.service";
import { notificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notifications.types";

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
  private crc32(buffer: Buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // Stored ZIP entries deliberately use no compression. It keeps the archive
  // implementation dependency-free while retaining every original file byte.
  private makeZip(entries: Array<{ name: string; content: Buffer }>) {
    const locals: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;
    for (const entry of entries) {
      const name = Buffer.from(entry.name.replace(/[\\/:*?"<>|]/g, "_"));
      const crc = this.crc32(entry.content);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
      local.writeUInt16LE(0, 8); local.writeUInt16LE(0, 10); local.writeUInt16LE(0, 12);
      local.writeUInt32LE(crc, 14); local.writeUInt32LE(entry.content.length, 18); local.writeUInt32LE(entry.content.length, 22);
      local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
      locals.push(local, name, entry.content);
      const header = Buffer.alloc(46);
      header.writeUInt32LE(0x02014b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(20, 6); header.writeUInt16LE(0x0800, 8);
      header.writeUInt16LE(0, 10); header.writeUInt16LE(0, 12); header.writeUInt16LE(0, 14); header.writeUInt32LE(crc, 16);
      header.writeUInt32LE(entry.content.length, 20); header.writeUInt32LE(entry.content.length, 24); header.writeUInt16LE(name.length, 28);
      header.writeUInt16LE(0, 30); header.writeUInt16LE(0, 32); header.writeUInt16LE(0, 34); header.writeUInt16LE(0, 36);
      header.writeUInt32LE(0, 38); header.writeUInt32LE(offset, 42);
      central.push(header, name);
      offset += local.length + name.length + entry.content.length;
    }
    const centralSize = central.reduce((size, part) => size + part.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, ...central, end]);
  }
  private async canAddAttachment(documentId: number, tenantId: number, userId: number, ownerId: number | null) {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document || document.status === "completed") return false;
    if (ownerId === userId) return true;
    const [activeApprover, activeSigner] = await Promise.all([
      prisma.document_approvals.findFirst({
        where: { document_id: documentId, approver_user_id: userId, action: "pending", document: { tenant_id: tenantId } },
        select: { id: true },
      }),
      prisma.signers.findFirst({
        where: { sign_request: { document_id: documentId, tenant_id: tenantId }, user_id: userId, status: { in: ["pending", "otp_sent"] } },
        select: { id: true },
      }),
    ]);
    return Boolean(activeApprover || activeSigner);
  }
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
      include: { uploader: { select: { id: true, full_name: true, email: true } } },
    });
  }

  async getAttachmentCapabilities(documentId: number, tenantId: number, userId: number) {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document) throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    const readDecision = await authorizationService.canAccessDocument(userId, tenantId, documentId, "read");
    if (!readDecision.allowed) throw ApiError.forbidden("You do not have access to this document", "DOCUMENT_ACCESS_DENIED");
    return { can_upload: await this.canAddAttachment(documentId, tenantId, userId, document.owner_id) };
  }

  async canWithdrawAttachment(attachment: { status: string; uploaded_by: number | null; document: { owner_id: number | null } }, documentId: number, tenantId: number, userId: number) {
    if (attachment.status !== "ACTIVE") return false;
    if (attachment.document.owner_id === userId) return true;
    return attachment.uploaded_by === userId && await this.canAddAttachment(documentId, tenantId, userId, attachment.document.owner_id);
  }

  async addAttachment(
    documentId: number,
    tenantId: number,
    userId: number,
    input: { file_name: string; file_base64: string; file_type?: string | null; attachment_kind?: "SUPPLEMENTAL" | "COMMENT_ATTACHMENT"; comment_id?: number | null },
  ) {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    const readDecision = await authorizationService.canAccessDocument(userId, tenantId, documentId, "read");
    if (!readDecision.allowed) {
      throw ApiError.forbidden("You do not have access to this document", "DOCUMENT_ACCESS_DENIED");
    }

    // Supporting evidence must not be mutable by every historical/future
    // participant. Only the owner or an approver with an active pending task
    // may add it. Later sequential steps are materialized as `waiting`, and
    // completed approvers no longer have `pending` records.
    if (!(await this.canAddAttachment(documentId, tenantId, userId, document.owner_id))) {
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
        attachment_kind: input.attachment_kind || "SUPPLEMENTAL",
        uploaded_by: userId,
        comment_id: input.comment_id || null,
      },
      include: { uploader: { select: { id: true, full_name: true, email: true } } },
    });

    await auditService.record({
      tenantId,
      documentId,
      event: input.attachment_kind === "COMMENT_ATTACHMENT" ? "document.comment_attachment_added" : "document.supplemental_added",
      userId,
    });

    const recipients = await prisma.document_approvals.findMany({
      where: { document_id: documentId, action: "pending", approver_user_id: { not: userId } },
      select: { approver_user_id: true },
    });
    const signingRecipients = await prisma.signers.findMany({
      where: { sign_request: { document_id: documentId }, status: { in: ["pending", "otp_sent"] }, user_id: { not: null } },
      select: { user_id: true },
    });
    const targetUserIds = new Set([...recipients.map((item) => item.approver_user_id), ...signingRecipients.map((item) => item.user_id!).filter((id) => id !== userId)]);
    await Promise.all([...targetUserIds].map((recipientId) => notificationsService.createNotification({
      tenantId,
      userId: recipientId,
      type: NotificationType.DOCUMENT_ATTACHMENT_ADDED,
      title: "Có tài liệu bổ sung cần xem",
      message: `Tệp "${input.file_name}" đã được bổ sung vào hồ sơ`,
      link: `/documents/${documentId}/flow`,
    })));

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

      await outboxDeliveryService.enqueueEmail(prisma, {
        tenantId,
        aggregateType: "document",
        aggregateId: documentId,
        template: "document_shared",
        data: {
          recipientEmail: email,
          documentTitle: document.title || document.original_file_name || 'Untitled',
          documentNumber: document.document_number || undefined,
          senderName: owner?.full_name || owner?.email || 'System',
          documentUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${document.id}`,
        },
        deduplicationKey: `document-shared:${documentId}:${email}`,
      });
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
    if (attachment.status === "WITHDRAWN") {
      throw ApiError.forbidden("This attachment has been withdrawn", "ATTACHMENT_WITHDRAWN");
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

  async getDossierFile(documentId: number, tenantId: number, userId: number) {
    const document = await this.getDocument(documentId, tenantId, userId);
    const lifecycleCompleted = ["completed", "signed", "fully_signed"].includes((document.status || "").toLowerCase());
    const hasSignedArtifact = lifecycleCompleted && Boolean(document.signed_file_path);
    const primary = hasSignedArtifact
      ? await this.getSignedDocumentFile(documentId, tenantId, userId)
      : await this.getDocumentFile(documentId, tenantId, userId);
    const [attachments, workflowRuns] = await Promise.all([
      this.listAttachments(documentId, tenantId, userId),
      prisma.workflow_instances.findMany({
        where: { document_id: documentId, document: { tenant_id: tenantId } },
        orderBy: { run_number: "asc" },
        include: {
          workflow: { select: { id: true, name: true, approval_mode: true } },
          approvals: {
            orderBy: { created_at: "asc" },
            include: {
              workflow_step: { select: { step_order: true, step_name: true } },
              approver: { select: { id: true, full_name: true, email: true } },
            },
          },
        },
      }),
    ]);
    const activeAttachments = attachments.filter((attachment) => attachment.status === "ACTIVE");
    const files: Array<{ name: string; content: Buffer }> = [{
      name: hasSignedArtifact ? `signed/${primary.fileName}` : `current/${primary.fileName}`,
      content: primary.fileBytes,
    }];
    const manifestAttachments: Array<Record<string, unknown>> = [];
    for (const attachment of activeAttachments) {
      const file = await this.getAttachmentFile(attachment.id, tenantId, userId);
      const archiveName = `attachments/${String(attachment.id).padStart(4, "0")}-${attachment.file_name}`;
      files.push({ name: archiveName, content: file.fileBytes });
      manifestAttachments.push({ id: attachment.id, name: attachment.file_name, archive_path: archiveName, kind: attachment.attachment_kind, comment_id: attachment.comment_id, uploaded_at: attachment.uploaded_at, size: attachment.file_size?.toString() ?? null, uploaded_by: attachment.uploader ? { id: attachment.uploader.id, name: attachment.uploader.full_name, email: attachment.uploader.email } : null });
    }
    const workflowHistory = workflowRuns.map((run) => ({
      id: run.id,
      run_number: run.run_number,
      status: run.status,
      workflow: run.workflow,
      started_at: run.started_at,
      completed_at: run.completed_at,
      approvals: run.approvals.map((approval) => ({
        id: approval.id,
        step_order: approval.workflow_step.step_order,
        step_name: approval.workflow_step.step_name,
        actor: {
          id: approval.approver.id,
          name: approval.approver.full_name,
          email: approval.approver.email,
        },
        outcome: approval.action,
        acted_at: approval.acted_at,
        comment: approval.comment,
      })),
    }));
    files.push({ name: "manifest.json", content: Buffer.from(JSON.stringify({
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        hash: document.hash,
        completed: lifecycleCompleted,
        signed_artifact_available: hasSignedArtifact,
        completion_certificate_applied: Boolean((document.artifact_metadata as Record<string, unknown> | null)?.certificate_applied),
        delivery_watermark_applied: Boolean((document.artifact_metadata as Record<string, unknown> | null)?.watermark_applied),
      },
      primary_file: primary.fileName,
      workflow_history: workflowHistory,
      attachments: manifestAttachments,
      withdrawn_attachments: attachments.filter((attachment) => attachment.status === "WITHDRAWN").map((attachment) => ({ id: attachment.id, name: attachment.file_name, status: attachment.status, reason: attachment.withdraw_reason, withdrawn_at: attachment.withdrawn_at })),
    }, null, 2)) });
    const baseName = (document.title || document.original_file_name || `document-${documentId}`).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
    return { fileName: `${baseName}-dossier.zip`, fileBytes: this.makeZip(files) };
  }

  async withdrawAttachment(documentId: number, attachmentId: number, tenantId: number, userId: number, reason: string) {
    const attachment = await prisma.document_attachments.findFirst({ where: { id: attachmentId, document_id: documentId, document: { tenant_id: tenantId } }, include: { document: { select: { owner_id: true } } } });
    if (!attachment) throw ApiError.notFound("Attachment not found", "ATTACHMENT_NOT_FOUND");
    if (attachment.status === "WITHDRAWN") throw ApiError.conflict("Attachment is already withdrawn", "ATTACHMENT_ALREADY_WITHDRAWN");
    if (!(await this.canWithdrawAttachment(attachment, documentId, tenantId, userId))) throw ApiError.forbidden("You cannot withdraw this attachment", "ATTACHMENT_WITHDRAW_DENIED");
    const updated = await prisma.document_attachments.update({ where: { id: attachmentId }, data: { status: "WITHDRAWN", withdrawn_by: userId, withdrawn_at: new Date(), withdraw_reason: reason }, include: { uploader: { select: { id: true, full_name: true, email: true } } } });
    await auditService.record({ tenantId, documentId, event: "document.attachment_withdrawn", userId });
    return updated;
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
    if (input.forceSignRequest && !input.fileName.toLowerCase().endsWith(".pdf")) {
      throw ApiError.badRequest(
        "Only PDF files are supported for signing requests",
        "SIGN_REQUEST_PDF_REQUIRED"
      );
    }
    await licenseService.enforceDocumentLimit(tenantId);
    let filePath: string;
    let hash: string;
    if (input.base64) {
      const buffer = Buffer.from(input.base64, "base64");
      if (input.forceSignRequest && buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
        throw ApiError.badRequest(
          "The signing request file must be a valid PDF",
          "SIGN_REQUEST_PDF_REQUIRED"
        );
      }
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
      if (input.forceSignRequest && buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
        throw ApiError.badRequest(
          "The signing request file must be a valid PDF",
          "SIGN_REQUEST_PDF_REQUIRED"
        );
      }
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

      if (
        input.forceSignRequest &&
        !documentType.require_approval &&
        !documentType.require_digital_signing
      ) {
        throw ApiError.badRequest(
          "Document type must require approval or digital signing",
          "DOCUMENT_TYPE_NOT_SIGN_REQUEST_CAPABLE"
        );
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

    if (input.forceSignRequest && !documentType) {
      throw ApiError.badRequest(
        "Document type is required for a sign request",
        "DOCUMENT_TYPE_REQUIRED"
      );
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
                require_digital_signing: documentType.require_digital_signing,
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

        await outboxDeliveryService.enqueueEmail(prisma, {
          tenantId,
          aggregateType: "document",
          aggregateId: document.id,
          template: "document_shared",
          data: {
            recipientEmail: email,
            documentTitle: input.title || input.fileName,
            documentNumber: document.document_number || undefined,
            senderName: owner?.full_name || owner?.email || 'System',
            documentUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${document.id}`,
          },
          deduplicationKey: `document-shared:${document.id}:${email}`,
        });
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

    // Authorization check: owner/admin/explicit policy with deny precedence
    if (userId) {
      const decision = await authorizationService.canAccessDocument(userId, tenantId, documentId, "delete");
      if (!decision.allowed) {
        throw ApiError.forbidden("You can only delete allowed documents", "DOCUMENT_DELETE_DENIED");
      }
    }

    const [workflowRunCount, approvalCount, submittedRequestCount, signingHistoryCount, submissionAuditCount] = await Promise.all([
      prisma.workflow_instances.count({ where: { document_id: document.id } }),
      prisma.document_approvals.count({ where: { document_id: document.id } }),
      prisma.sign_requests.count({ where: { document_id: document.id, status: { not: "draft" } } }),
      prisma.signers.count({
        where: {
          sign_request: { document_id: document.id },
          OR: [
            { signed_at: { not: null } },
            { signature_data: { not: null } },
            { status: { in: ["signed", "completed", "rejected", "cancelled"] } },
          ],
        },
      }),
      prisma.audit_logs.count({
        where: {
          document_id: document.id,
          event: { in: ["sign.sent", "sign.submitted_for_approval", "sign.cancelled", "sign.internal_rejected"] },
        },
      }),
    ]);
    const hasLifecycleHistory = workflowRunCount + approvalCount + submittedRequestCount + signingHistoryCount + submissionAuditCount > 0;
    const disposition = getDocumentDeleteDisposition(document.status, hasLifecycleHistory);

    if (disposition === "archive") {
      await documentLifecycleService.archive(document, userId || 0);
      return;
    }
    if (disposition === "deny") {
      throw ApiError.badRequest(
        document.status === "draft" && hasLifecycleHistory
          ? "Draft documents with workflow or signing history cannot be permanently deleted"
          : "Active and completed documents cannot be deleted or archived",
        document.status === "draft" && hasLifecycleHistory
          ? "DOCUMENT_DRAFT_HAS_LIFECYCLE_HISTORY"
          : "DOCUMENT_DELETE_DENIED_STATUS",
      );
    }
    
    // Database runtime records are deleted atomically. Files are intentionally
    // not removed here; storage cleanup must remain retryable/outside the DB transaction.
    await prisma.$transaction(async (tx) => {
      await tx.audit_logs.deleteMany({ where: { document_id: document.id } });

      const signRequests = await tx.sign_requests.findMany({
        where: { document_id: document.id },
        select: { id: true },
      });
      const signRequestIds = signRequests.map((request) => request.id);
      if (signRequestIds.length > 0) {
        await tx.sign_request_field_values.deleteMany({
          where: { field: { sign_request_id: { in: signRequestIds } } },
        });
        await tx.sign_request_fields.deleteMany({ where: { sign_request_id: { in: signRequestIds } } });
        await tx.signers.deleteMany({ where: { sign_request_id: { in: signRequestIds } } });
        await tx.sign_requests.deleteMany({ where: { id: { in: signRequestIds } } });
      }

      await tx.document_approvals.deleteMany({ where: { document_id: document.id } });
      await tx.workflow_instances.deleteMany({ where: { document_id: document.id } });

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
        approval_mode: template.approval_mode,
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
        approval_mode: template.approval_mode,
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

  async getDocumentFile(documentId: number, tenantId: number, userId?: number): Promise<DocumentFileResult> {
    return documentFileService.getOriginalFile(await this.getDocument(documentId, tenantId, userId));
  }

  async getSignedDocumentFile(documentId: number, tenantId: number, userId?: number): Promise<DocumentFileResult> {
    const document = await this.getDocument(documentId, tenantId, userId);
    if (document.status === "completed") {
      const metadata = document.artifact_metadata as Record<string, unknown> | null;
      if (!document.signed_file_path || !document.hash || metadata?.certificate_applied !== true) {
        throw ApiError.conflict("Final PDF is not ready", "FINAL_ARTIFACT_NOT_READY");
      }
    }
    return documentFileService.getSignedFile(document);
  }

  async getDocumentDeliveryFile(documentId: number, tenantId: number, userId?: number): Promise<DocumentFileResult> {
    const document = await this.getDocument(documentId, tenantId, userId);
    if (document.status === "completed") {
      if (!document.signed_file_path || !document.hash) {
        throw ApiError.conflict("Final PDF is not ready", "FINAL_ARTIFACT_NOT_READY");
      }
      return documentFileService.getSignedFile(document);
    }
    return documentFileService.getOriginalFile(document);
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
      const fieldCount = await prisma.sign_request_fields.count({ where: { sign_request_id: document.sign_request_id } });
      if (fieldCount > 0) {
        const validation = await signRequestFieldsService.validateFieldsBeforeSend(document.sign_request_id);
        if (!validation.valid) {
          throw ApiError.badRequest(validation.message || 'Sign fields validation failed', 'SIGN_FIELDS_INVALID');
        }
      }
    }
    
    // Determine workflow
    const finalWorkflowId = workflowId || documentType.default_workflow_id;
    
    if (finalWorkflowId) {
      // Has workflow - submit for approval
      const { approvalsService } = await import('../approvals/approvals.service');
      await approvalsService.submitForApproval(documentId, finalWorkflowId, tenantId, userId);
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
    await documentLifecycleService.archive(await this.getDocument(documentId, tenantId, userId), userId);
  }

  async cancelDocument(documentId: number, tenantId: number, userId: number): Promise<void> {
    await documentLifecycleService.cancel(await this.getDocument(documentId, tenantId, userId), userId);
  }
}

export const documentsService = new DocumentsService();
