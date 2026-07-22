import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../../core/utils/response";
import { documentsService } from "./documents.service";
import { toDocumentAttachmentDTO, toDocumentAttachmentDTOs, toDocumentDTO, toDocumentDTOs } from "./documents.dto";
import { auditService } from "../audit/audit.service";
import { authorizationService } from "../authorization/authorization.service";
import { prisma } from "../../config/prisma";

const createSchema = z
  .object({
    file_name: z.string().min(1),
    file_base64: z.string().optional(),
    storage_path: z.string().optional(),
    document_type_id: z.coerce.number().int().positive().optional(),
    department_id: z.coerce.number().int().positive().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    priority_level: z.string().optional(),
    confidential_level: z.string().optional(),
    visibility_scope: z.string().optional(),
    effective_date: z.coerce.date().optional(),
    expiration_date: z.coerce.date().optional(),
    intake_mode: z.enum(['new', 'revision', 'external_signed_import']).default('new'),
    source_document_id: z.coerce.number().int().positive().optional(),
    revision_comment: z.string().trim().max(1000).optional(),
    
    // Workflow options
    workflow_id: z.coerce.number().int().positive().optional(),
    
    adhoc_steps: z.array(z.object({
      approver_user_id: z.number(),
      due_in_days: z.number().min(1).max(365),
    })).optional(),
    
    customized_steps: z.array(z.object({
      step_name: z.string().optional(),
      approver_type: z.enum(['user', 'role', 'department', 'manager']),
      approver_id: z.number(),
      participant_role: z.enum(['approver', 'signer']).optional(), // ✅ Add participant_role
      due_in_days: z.number().min(1).max(365),
      order: z.number().int().positive().optional(), // ✅ Add order field
    })).optional(),
    
    // Inline recipients, CC, and attachments
    signers: z.array(z.object({
      email: z.string().email(),
      name: z.string().min(1),
      order: z.number().int().positive(),
      type: z.enum(['manual', 'external']),
      external_org_id: z.number().int().positive().optional(),
    })).optional(),
    
    cc_emails: z.array(z.string().email()).optional(),
    
    attachments: z.array(z.object({
      file_name: z.string().min(1),
      file_base64: z.string().min(1),
      file_type: z.string(),
    })).optional(),

    detail_permissions: z.array(z.object({
      subject_type: z.enum(["user", "department", "position_in_department"]),
      subject_id: z.coerce.number().int().positive(),
      scope_department_id: z.coerce.number().int().positive().optional(),
      scope: z.string().optional(),
      permissions_json: z.array(z.string()).optional().nullable(),
      status_limit_json: z.array(z.string()).optional().nullable(),
      can_read: z.boolean().optional(),
      can_edit: z.boolean().optional(),
      can_approve: z.boolean().optional(),
      can_share: z.boolean().optional(),
      can_delete: z.boolean().optional(),
    }).superRefine((value, ctx) => {
      if (value.subject_type === "position_in_department" && !value.scope_department_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scope_department_id is required for position_in_department",
          path: ["scope_department_id"],
        });
      }
    })).optional(),

    create_sign_request: z.boolean().optional(),
  })
  .refine((data) => data.file_base64 || data.storage_path, {
    message: "file_base64 or storage_path is required",
    path: ["file_base64"],
  });

const idSchema = z.coerce.number().int().positive();
const attachmentSchema = z.object({
  file_name: z.string().min(1),
  file_base64: z.string().min(1),
  file_type: z.string().optional(),
  attachment_kind: z.enum(["SUPPLEMENTAL", "COMMENT_ATTACHMENT"]).optional(),
});
const withdrawAttachmentSchema = z.object({ reason: z.string().trim().min(3).max(1000) });
const ccEmailsSchema = z.object({
  emails: z.array(z.string().email()),
});
const documentPermissionSchema = z.object({
  permission_source: z.enum(["share", "baseline"]).default("baseline"),
  subject_type: z.enum(["user", "department", "position_in_department", "role"]),
  subject_id: z.coerce.number().int().positive(),
  scope_department_id: z.coerce.number().int().positive().optional(),
  scope: z.string().optional(),
  permissions_json: z.array(z.string()).optional().nullable(),
  status_limit_json: z.array(z.string()).optional().nullable(),
  can_read: z.boolean().optional(),
  can_edit: z.boolean().optional(),
  can_approve: z.boolean().optional(),
  can_share: z.boolean().optional(),
  can_delete: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.subject_type === "position_in_department" && !value.scope_department_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "scope_department_id is required for position_in_department",
      path: ["scope_department_id"],
    });
  }
});
const revokeDocumentPermissionSchema = z.object({
  permission_source: z.enum(["share", "baseline"]).default("baseline"),
  subject_type: z.enum(["user", "department", "position_in_department", "role"]),
  subject_id: z.coerce.number().int().positive(),
  scope_department_id: z.coerce.number().int().positive().optional(),
});

export class DocumentsController {
  list = async (req: Request, res: Response): Promise<void> => {
    // Check if pagination params exist
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const noSigningOnly = req.query.no_signing_only === 'true';
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const documentTypeId = req.query.document_type_id ? parseInt(req.query.document_type_id as string) : undefined;
    const confidentialLevel = req.query.confidential_level as string | undefined;
    const currentOnly = req.query.current_only === 'true';

    if (page || limit) {
      // Use paginated endpoint
      const result = await documentsService.listDocumentsPaginated(
        req.auth!.tenantId,
        req.auth!.userId,
        page || 1,
        limit || 10,
        noSigningOnly,
        status,
        search,
        documentTypeId,
        confidentialLevel,
        currentOnly,
      );
      res.json(ok({
        documents: toDocumentDTOs(result.data),
        pagination: result.pagination,
      }));
    } else {
      // Use original non-paginated endpoint (backward compatibility)
      const documents = await documentsService.listDocuments(req.auth!.tenantId, req.auth!.userId, noSigningOnly);
      res.json(ok({ documents: toDocumentDTOs(documents) }));
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const document = await documentsService.getDocument(documentId, req.auth!.tenantId, req.auth!.userId);
    // Security: Use DTO to exclude file_path from response
    res.json(ok({ document: toDocumentDTO(document) }));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createSchema.parse(req.body);
    const document = await documentsService.createDocument(
      {
        fileName: body.file_name,
        base64: body.file_base64,
        storagePath: body.storage_path,
        documentTypeId: body.document_type_id,
        departmentId: body.department_id,
        title: body.title,
        summary: body.summary,
        priorityLevel: body.priority_level,
        confidentialLevel: body.confidential_level,
        visibilityScope: body.visibility_scope,
        effectiveDate: body.effective_date,
        expirationDate: body.expiration_date,
        intakeMode: body.intake_mode,
        sourceDocumentId: body.source_document_id,
        revisionComment: body.revision_comment,
        workflowId: body.workflow_id, // ✅ Pass workflow_id to service
        adhocSteps: body.adhoc_steps?.map((step) => ({
          approver_user_id: step.approver_user_id!,
          due_in_days: step.due_in_days!,
        })),
        customizedSteps: body.customized_steps?.map((step) => ({
          step_name: step.step_name,
          approver_type: step.approver_type!,
          approver_id: step.approver_id!,
          participant_role: step.participant_role,
          due_in_days: step.due_in_days!,
          order: step.order,
        })),
        signers: body.signers?.map((signer) => ({
          email: signer.email!,
          name: signer.name!,
          order: signer.order!,
          type: signer.type!,
          external_org_id: signer.external_org_id,
        })),
        ccEmails: body.cc_emails,
        attachments: body.attachments?.map((attachment) => ({
          file_name: attachment.file_name!,
          file_base64: attachment.file_base64!,
          file_type: attachment.file_type!,
        })),
        detailPermissions: body.detail_permissions?.map((permission) => ({
          subject_type: permission.subject_type!,
          subject_id: permission.subject_id!,
          scope_department_id: permission.scope_department_id,
          scope: permission.scope,
          permissions_json: permission.permissions_json,
          status_limit_json: permission.status_limit_json,
          can_read: permission.can_read,
          can_edit: permission.can_edit,
          can_approve: permission.can_approve,
          can_share: permission.can_share,
          can_delete: permission.can_delete,
        })),
        forceSignRequest: body.create_sign_request,
      },
      req.auth!.tenantId,
      req.auth!.userId,
      req.ip,
      req.headers["user-agent"],
    );
    // Security: Use DTO to exclude file_path from response
    res.status(201).json(ok({ document: toDocumentDTO(document) }));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    await documentsService.deleteDocument(documentId, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ deleted: true }));
  };

  listAttachments = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const attachments = await documentsService.listAttachments(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );
    const capabilities = await documentsService.getAttachmentCapabilities(documentId, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ attachments: toDocumentAttachmentDTOs(attachments), ...capabilities }));
  };

  addAttachment = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const body = attachmentSchema.parse(req.body);
    const attachment = await documentsService.addAttachment(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId,
      {
        file_name: body.file_name,
        file_base64: body.file_base64,
        file_type: body.file_type,
        attachment_kind: body.attachment_kind,
      }
    );
    res.status(201).json(ok({ attachment: toDocumentAttachmentDTO(attachment) }));
  };

  syncCCEmails = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const body = ccEmailsSchema.parse(req.body);
    const ccEmails = await documentsService.syncCCEmails(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId,
      body.emails
    );
    res.json(ok({ cc_emails: ccEmails.map((item) => item.email) }));
  };

  downloadAttachment = async (req: Request, res: Response): Promise<void> => {
    const attachmentId = idSchema.parse(req.params.attachmentId);
    const documentId = idSchema.parse(req.params.id);
    const { fileBytes, fileName, mimeType } = await documentsService.getAttachmentFile(
      attachmentId,
      req.auth!.tenantId,
      req.auth!.userId
    );

    await auditService.record({
      tenantId: req.auth!.tenantId,
      documentId,
      event: "document.attachment_downloaded",
      userId: req.auth!.userId,
      ip: req.ip,
      ua: req.headers["user-agent"],
    });

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileBytes);
  };

  listRevisionSources = async (req: Request, res: Response): Promise<void> => {
    const mode = req.query.mode === 'sign_request' ? 'sign_request' : 'repository';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const documents = await documentsService.listRevisionSources(
      req.auth!.tenantId,
      req.auth!.userId,
      mode,
      search || undefined,
    );
    res.json(ok({ documents: toDocumentDTOs(documents) }));
  };

  getRevisionHistory = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const revisions = await documentsService.getRevisionHistory(documentId, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ revisions }));
  };

  downloadDossier = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const dossier = await documentsService.getDossierFile(documentId, req.auth!.tenantId, req.auth!.userId);
    await auditService.record({ tenantId: req.auth!.tenantId, documentId, event: "document.dossier_downloaded", userId: req.auth!.userId, ip: req.ip, ua: req.headers["user-agent"] });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${dossier.fileName}"`);
    res.send(dossier.fileBytes);
  };

  withdrawAttachment = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const attachmentId = idSchema.parse(req.params.attachmentId);
    const { reason } = withdrawAttachmentSchema.parse(req.body);
    const attachment = await documentsService.withdrawAttachment(documentId, attachmentId, req.auth!.tenantId, req.auth!.userId, reason);
    res.json(ok({ attachment: toDocumentAttachmentDTO(attachment) }));
  };

  // Tags endpoints
  addTag = async (req: Request, res: Response): Promise<void> => {
    const { tagsService } = await import("./tags.service");
    const documentId = idSchema.parse(req.params.id);
    const { tag } = req.body;
    
    if (!tag || typeof tag !== "string") {
      res.status(400).json({ success: false, error: { message: "Tag is required" } });
      return;
    }

    const tags = await tagsService.addTag(documentId, tag, req.auth!.tenantId);
    res.json(ok({ tags }));
  };

  removeTag = async (req: Request, res: Response): Promise<void> => {
    const { tagsService } = await import("./tags.service");
    const documentId = idSchema.parse(req.params.id);
    const { tag } = req.body;
    
    if (!tag || typeof tag !== "string") {
      res.status(400).json({ success: false, error: { message: "Tag is required" } });
      return;
    }

    const tags = await tagsService.removeTag(documentId, tag, req.auth!.tenantId);
    res.json(ok({ tags }));
  };

  getTags = async (req: Request, res: Response): Promise<void> => {
    const { tagsService } = await import("./tags.service");
    const documentId = idSchema.parse(req.params.id);
    const tags = await tagsService.getDocumentTags(documentId);
    res.json(ok({ tags }));
  };

  getAllTags = async (req: Request, res: Response): Promise<void> => {
    const { tagsService } = await import("./tags.service");
    const tags = await tagsService.getAllTags(req.auth!.tenantId);
    res.json(ok({ tags }));
  };

  // Permissions endpoints
  grantPermission = async (req: Request, res: Response): Promise<void> => {
    const { permissionsService } = await import("./permissions.service");
    const documentId = idSchema.parse(req.params.id);
    const body = documentPermissionSchema.parse(req.body);
    const payload = {
      permission_source: body.permission_source,
      subject_type: body.subject_type,
      subject_id: body.subject_id,
      scope_department_id: body.scope_department_id,
      scope: body.scope,
      permissions_json: body.permissions_json,
      status_limit_json: body.status_limit_json,
      can_read: body.can_read,
      can_edit: body.can_edit,
      can_approve: body.can_approve,
      can_share: body.can_share,
      can_delete: body.can_delete,
    };
    const permission = await permissionsService.grantPermission(
      documentId,
      payload,
      req.auth!.userId,
      req.auth!.tenantId
    );
    res.json(ok({ permission }));
  };

  revokePermission = async (req: Request, res: Response): Promise<void> => {
    const { permissionsService } = await import("./permissions.service");
    const documentId = idSchema.parse(req.params.id);
    const { permission_source, subject_type, subject_id, scope_department_id } =
      revokeDocumentPermissionSchema.parse(req.body) as z.infer<typeof revokeDocumentPermissionSchema>;
    
    await permissionsService.revokePermission(
      documentId,
      subject_type,
      subject_id,
      permission_source,
      scope_department_id,
      req.auth!.tenantId
    );
    res.json(ok({ message: "Permission revoked" }));
  };

  getPermissions = async (req: Request, res: Response): Promise<void> => {
    const { permissionsService } = await import("./permissions.service");
    const documentId = idSchema.parse(req.params.id);
    const permissions = await permissionsService.getDocumentPermissions(
      documentId,
      req.auth!.tenantId
    );
    res.json(ok({ permissions }));
  };

  getEffectivePermissions = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const decision = await authorizationService.resolveDocumentPermission(
      req.auth!.userId,
      req.auth!.tenantId,
      documentId
    );
    res.json(ok({ permissions: decision }));
  };

  getEffectiveViewers = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const users = await prisma.users.findMany({
      where: { tenant_id: req.auth!.tenantId, status: "active" },
      select: {
        id: true,
        full_name: true,
        email: true,
        avatar_url: true,
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
      orderBy: [{ full_name: "asc" }, { email: "asc" }],
    });

    const decisions = await Promise.all(users.map(async (user) => ({
      user,
      permissions: await authorizationService.resolveDocumentPermission(
        user.id,
        req.auth!.tenantId,
        documentId
      ),
    })));

    res.json(ok({
      viewers: decisions
        .filter((item) => item.permissions.canView)
        .map((item) => ({
          id: item.user.id,
          full_name: item.user.full_name,
          email: item.user.email,
          avatar_url: item.user.avatar_url,
          department: item.user.department,
          position: item.user.position,
          reasons: item.permissions.reasons,
        })),
    }));
  };

  // Versions endpoints
  createVersion = async (req: Request, res: Response): Promise<void> => {
    const { versionsService } = await import("./versions.service");
    const documentId = idSchema.parse(req.params.id);
    
    const nextVersion = await versionsService.getNextVersionNumber(documentId);
    
    const version = await versionsService.createVersion(
      documentId,
      {
        ...req.body,
        version_no: nextVersion,
        uploaded_by: req.auth!.userId,
      },
      req.auth!.tenantId
    );
    
    res.status(201).json(ok({ version }));
  };

  getVersions = async (req: Request, res: Response): Promise<void> => {
    const { versionsService } = await import("./versions.service");
    const documentId = idSchema.parse(req.params.id);
    const versions = await versionsService.getDocumentVersions(
      documentId,
      req.auth!.tenantId
    );
    res.json(ok({ versions }));
  };

  getLatestVersion = async (req: Request, res: Response): Promise<void> => {
    const { versionsService } = await import("./versions.service");
    const documentId = idSchema.parse(req.params.id);
    const version = await versionsService.getLatestVersion(
      documentId,
      req.auth!.tenantId
    );
    res.json(ok({ version }));
  };

  // Download & View endpoints
  download = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const file = await documentsService.getDocumentDeliveryFile(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );

    await auditService.record({
      tenantId: req.auth!.tenantId,
      documentId,
      event: "document.downloaded",
      userId: req.auth!.userId,
      ip: req.ip,
      ua: req.headers["user-agent"],
    });

    // Set headers for download
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);

    res.send(file.fileBytes);
  };

  view = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const file = await documentsService.getDocumentDeliveryFile(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );

    await auditService.record({
      tenantId: req.auth!.tenantId,
      documentId,
      event: "document.viewed",
      userId: req.auth!.userId,
      ip: req.ip,
      ua: req.headers["user-agent"],
    });

    // Set headers for inline viewing
    res.setHeader('Content-Type', file.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);

    res.send(file.fileBytes);
  };

  downloadSigned = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const file = await documentsService.getSignedDocumentFile(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );

    await auditService.record({
      tenantId: req.auth!.tenantId,
      documentId,
      event: "document.signed_downloaded",
      userId: req.auth!.userId,
      ip: req.ip,
      ua: req.headers["user-agent"],
    });

    // Set headers for download
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);

    res.send(file.fileBytes);
  };

  viewSigned = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const file = await documentsService.getSignedDocumentFile(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );

    await auditService.record({
      tenantId: req.auth!.tenantId,
      documentId,
      event: "document.signed_viewed",
      userId: req.auth!.userId,
      ip: req.ip,
      ua: req.headers["user-agent"],
    });

    // Set headers for inline viewing
    res.setHeader('Content-Type', file.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    
    // Disable caching to ensure latest progressive PDF is always shown
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(file.fileBytes);
  };

  submitForApproval = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const { workflow_id } = req.body;
    
    const document = await documentsService.submitForApproval(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId,
      workflow_id
    );
    
    res.json(ok({ document: toDocumentDTO(document) }));
  };

  archiveDocument = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    
    await documentsService.archiveDocument(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );
    
    res.json(ok({ message: 'Document archived successfully' }));
  };

  cancelDocument = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    
    await documentsService.cancelDocument(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );
    
    res.json(ok({ message: 'Document cancelled successfully' }));
  };
}
