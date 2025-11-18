import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "../../core/utils/response";
import { documentsService } from "./documents.service";

const createSchema = z
  .object({
    file_name: z.string().min(1),
    file_base64: z.string().optional(),
    storage_path: z.string().optional(),
  })
  .refine((data) => data.file_base64 || data.storage_path, {
    message: "file_base64 or storage_path is required",
    path: ["file_base64"],
  });

const idSchema = z.coerce.number().int().positive();

export class DocumentsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const documents = await documentsService.listDocuments(req.auth!.tenantId);
    res.json(ok({ documents }));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const documentId = idSchema.parse(req.params.id);
    const document = await documentsService.getDocument(documentId, req.auth!.tenantId);
    res.json(ok({ document }));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createSchema.parse(req.body);
    const document = await documentsService.createDocument(
      {
        fileName: body.file_name,
        base64: body.file_base64,
        storagePath: body.storage_path,
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
}
