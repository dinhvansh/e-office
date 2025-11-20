import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../../core/utils/response";
import { documentsService } from "./documents.service";

const createSchema = z
  .object({
    file_name: z.string().min(1),
    file_base64: z.string().optional(),
    storage_path: z.string().optional(),
    document_type_id: z.coerce.number().int().positive().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    priority_level: z.string().optional(),
    confidential_level: z.string().optional(),
    visibility_scope: z.string().optional(),
  })
  .refine((data) => data.file_base64 || data.storage_path, {
    message: "file_base64 or storage_path is required",
    path: ["file_base64"],
  });

const idSchema = z.coerce.number().int().positive();

export class DocumentsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const documents = await documentsService.listDocuments(req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ documents }));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const document = await documentsService.getDocument(documentId, req.auth!.tenantId, req.auth!.userId);
    res.json(ok({ document }));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createSchema.parse(req.body);
    const document = await documentsService.createDocument(
      {
        fileName: body.file_name,
        base64: body.file_base64,
        storagePath: body.storage_path,
        documentTypeId: body.document_type_id,
        title: body.title,
        summary: body.summary,
        priorityLevel: body.priority_level,
        confidentialLevel: body.confidential_level,
        visibilityScope: body.visibility_scope,
      },
      req.auth!.tenantId,
      req.auth!.userId,
      req.ip,
      req.headers["user-agent"],
    );
    res.status(201).json(ok({ document }));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    await documentsService.deleteDocument(documentId, req.auth!.tenantId);
    res.json(ok({ deleted: true }));
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
}
