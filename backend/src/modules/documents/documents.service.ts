import { documents } from "@prisma/client";
import { promises as fs } from "fs";
import crypto from "crypto";
import { ApiError } from "../../core/errors/api-error";
import { saveBase64Document } from "../../core/utils/fileStorage";
import { auditService } from "../audit/audit.service";
import { licenseService } from "../licenses/license.service";
import { CreateDocumentData, documentsRepository } from "./documents.repository";

export interface CreateDocumentInput {
  fileName: string;
  base64?: string;
  storagePath?: string;
}

class DocumentsService {
  async listDocuments(tenantId: number): Promise<documents[]> {
    return documentsRepository.listByTenant(tenantId);
  }

  async getDocument(documentId: number, tenantId: number): Promise<documents> {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }
    return document;
  }

  async createDocument(input: CreateDocumentInput, tenantId: number, ownerId: number, requesterIp?: string, userAgent?: string) {
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
      filePath = input.storagePath!;
      const buffer = await fs.readFile(filePath);
      hash = crypto.createHash("sha256").update(buffer).digest("hex");
    }
    const payload: CreateDocumentData = {
      tenant_id: tenantId,
      owner_id: ownerId,
      file_path: filePath,
      hash,
      status: "draft",
    };
    const document = await documentsRepository.create(payload);
    await auditService.record({
      tenantId,
      documentId: document.id,
      event: "document.uploaded",
      userId: ownerId,
      ip: requesterIp,
      ua: userAgent,
    });
    return document;
  }

  async deleteDocument(documentId: number, tenantId: number): Promise<void> {
    const document = await this.getDocument(documentId, tenantId);
    await documentsRepository.delete(document.id);
    await auditService.record({
      tenantId,
      documentId: document.id,
      event: "document.deleted",
    });
  }
}

export const documentsService = new DocumentsService();
