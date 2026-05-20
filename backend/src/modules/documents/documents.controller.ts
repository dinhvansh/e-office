import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../../core/utils/response";
import { documentsService } from "./documents.service";
import { toDocumentAttachmentDTO, toDocumentAttachmentDTOs, toDocumentDTO, toDocumentDTOs } from "./documents.dto";
import { auditService } from "../audit/audit.service";

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
});
const ccEmailsSchema = z.object({
  emails: z.array(z.string().email()),
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
        confidentialLevel
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
        workflowId: body.workflow_id, // ✅ Pass workflow_id to service
        adhocSteps: body.adhoc_steps as any,
        customizedSteps: body.customized_steps as any,
        signers: body.signers as any,
        ccEmails: body.cc_emails as any,
        attachments: body.attachments as any,
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
    res.json(ok({ attachments: toDocumentAttachmentDTOs(attachments) }));
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
    const { filePath, fileName, mimeType } = await documentsService.getAttachmentFile(
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
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending attachment file:', err);
        if (!res.headersSent) {
          res.status(404).json({ success: false, error: { message: 'File not found' } });
        }
      }
    });
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
    const permission = await permissionsService.grantPermission(
      documentId,
      req.body,
      req.auth!.userId,
      req.auth!.tenantId
    );
    res.json(ok({ permission }));
  };

  revokePermission = async (req: Request, res: Response): Promise<void> => {
    const { permissionsService } = await import("./permissions.service");
    const documentId = idSchema.parse(req.params.id);
    const { subject_type, subject_id } = req.body;
    
    await permissionsService.revokePermission(
      documentId,
      subject_type,
      subject_id,
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
    const file = await documentsService.getDocumentFile(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );
    const watermarkBuffer = await documentsService.getWatermarkedDocumentBufferIfNeeded(file);

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

    if (watermarkBuffer) {
      res.send(watermarkBuffer);
      return;
    }

    // Send file
    res.sendFile(file.filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(404).json({ success: false, error: { message: 'File not found' } });
        }
      }
    });
  };

  view = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const file = await documentsService.getDocumentFile(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );
    const watermarkBuffer = await documentsService.getWatermarkedDocumentBufferIfNeeded(file);

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

    if (watermarkBuffer) {
      res.send(watermarkBuffer);
      return;
    }

    // Send file
    res.sendFile(file.filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(404).json({ success: false, error: { message: 'File not found' } });
        }
      }
    });
  };

  downloadSigned = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const file = await documentsService.getSignedDocumentFile(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );
    const watermarkBuffer = await documentsService.getWatermarkedDocumentBufferIfNeeded(file);

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

    if (watermarkBuffer) {
      res.send(watermarkBuffer);
      return;
    }

    // Send file
    res.sendFile(file.filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(404).json({ success: false, error: { message: 'File not found' } });
        }
      }
    });
  };

  viewSigned = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const file = await documentsService.getSignedDocumentFile(
      documentId,
      req.auth!.tenantId,
      req.auth!.userId
    );
    const watermarkBuffer = await documentsService.getWatermarkedDocumentBufferIfNeeded(file);

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

    if (watermarkBuffer) {
      res.send(watermarkBuffer);
      return;
    }
    
    // Send file
    res.sendFile(file.filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(404).json({ success: false, error: { message: 'File not found' } });
        }
      }
    });
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
