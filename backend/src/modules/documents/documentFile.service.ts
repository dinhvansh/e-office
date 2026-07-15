import { documents } from "@prisma/client";
import { promises as fs } from "fs";
import path from "node:path";
import { ApiError } from "../../core/errors/api-error";
import { readStoredFile } from "../../core/storage/fileStorage";
import { storageService } from "../../core/storage/storage.service";
import {
  applyWatermarkToPdfBytes,
  getTenantWatermarkConfig,
  resolveWatermarkVariantForStatus,
} from "../settings/watermark.helper";

export interface DocumentFileResult {
  fileBytes: Buffer;
  fileName: string;
  mimeType: string;
  documentStatus: string | null;
  tenantId: number;
}

const mimeTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".txt": "text/plain",
  ".zip": "application/zip",
};

class DocumentFileService {
  async getOriginalFile(document: documents): Promise<DocumentFileResult> {
    if (document.file_path.startsWith("/uploads/")) {
      throw ApiError.notFound("File not found (seed data)", "FILE_NOT_FOUND");
    }
    const docNumber = document.document_number || `DOC-${document.id}`;
    const title = document.title || document.original_file_name.replace(/\.[^/.]+$/, "");
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "-").substring(0, 50);
    const ext = path.extname(document.file_path);
    const fileName = `${docNumber}_${sanitizedTitle}_Original${ext}`;
    try {
      const fileBytes = path.isAbsolute(document.file_path)
        ? await fs.readFile(document.file_path)
        : await readStoredFile(storageService, document.file_path);
      return { fileBytes: Buffer.from(fileBytes), fileName, mimeType: mimeTypes[ext.toLowerCase()] || "application/octet-stream", documentStatus: document.status || null, tenantId: document.tenant_id };
    } catch {
      throw ApiError.notFound("File not found on disk", "FILE_NOT_FOUND");
    }
  }

  async getSignedFile(document: documents): Promise<DocumentFileResult> {
    if (!document.signed_file_path) throw ApiError.notFound("Signed file not available", "SIGNED_FILE_NOT_FOUND");
    const docNumber = document.document_number || `DOC-${document.id}`;
    const title = document.title || document.original_file_name.replace(".pdf", "");
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "-").substring(0, 50);
    const fileName = `${docNumber}_${sanitizedTitle}_${document.status === "completed" ? "Signed" : "Draft"}.pdf`;
    try {
      const fileBytes = path.isAbsolute(document.signed_file_path)
        ? await fs.readFile(document.signed_file_path)
        : await readStoredFile(storageService, document.signed_file_path);
      return { fileBytes: Buffer.from(fileBytes), fileName, mimeType: "application/pdf", documentStatus: document.status || null, tenantId: document.tenant_id };
    } catch {
      throw ApiError.notFound("Signed file not found on disk", "FILE_NOT_FOUND");
    }
  }

  async getWatermarkedBufferIfNeeded(input: {
    fileBytes: Uint8Array;
    mimeType: string;
    documentStatus: string | null;
    tenantId: number;
  }): Promise<Buffer | null> {
    if (input.mimeType !== "application/pdf") return null;
    const config = await getTenantWatermarkConfig(input.tenantId);
    const variant = resolveWatermarkVariantForStatus(config, input.documentStatus);
    return variant ? Buffer.from(await applyWatermarkToPdfBytes(input.fileBytes, config, variant)) : null;
  }
}

export const documentFileService = new DocumentFileService();
