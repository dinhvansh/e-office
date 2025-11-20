import { documents } from "@prisma/client";
import { promises as fs } from "fs";
import crypto from "crypto";
import { ApiError } from "../../core/errors/api-error";
import { saveBase64Document } from "../../core/utils/fileStorage";
import { auditService } from "../audit/audit.service";
import { licenseService } from "../licenses/license.service";
import { numberingService } from "../numbering/numbering.service";
import { prisma } from "../../config/prisma";
import { CreateDocumentData, documentsRepository } from "./documents.repository";
import { canViewDocument, filterViewableDocuments } from "./documents.access";

export interface CreateDocumentInput {
  fileName: string;
  base64?: string;
  storagePath?: string;
  documentTypeId?: number;
  title?: string;
  summary?: string;
  priorityLevel?: string;
  confidentialLevel?: string;
  visibilityScope?: string;
}

class DocumentsService {
  async listDocuments(tenantId: number, userId?: number): Promise<documents[]> {
    const documents = await documentsRepository.listByTenant(tenantId);
    
    // If no userId provided (admin context), return all documents
    if (!userId) {
      return documents;
    }
    
    // Get user for permission check
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });
    
    if (!user || user.tenant_id !== tenantId) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }
    
    // Filter documents based on user permissions
    return await filterViewableDocuments(user, documents);
  }

  async getDocument(documentId: number, tenantId: number, userId?: number): Promise<documents> {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }
    
    // If no userId provided (admin context), return document
    if (!userId) {
      return document;
    }
    
    // Get user for permission check
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });
    
    if (!user || user.tenant_id !== tenantId) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }
    
    // Check if user can view this document
    const canView = await canViewDocument(user, document);
    if (!canView) {
      throw ApiError.forbidden("You do not have access to this document", "DOCUMENT_ACCESS_DENIED");
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

    // Handle document type and numbering
    let documentTypeId: number | null = null;
    let documentNumber: string | null = null;
    let numberingRuleId: number | null = null;

    if (input.documentTypeId) {
      // Load document type
      const documentType = await prisma.document_types.findFirst({
        where: {
          id: input.documentTypeId,
          tenant_id: tenantId,
          is_active: true,
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

    const payload: CreateDocumentData = {
      tenant_id: tenantId,
      owner_id: ownerId,
      file_path: filePath,
      hash,
      status: "draft",
      document_type_id: documentTypeId,
      document_number: documentNumber,
      numbering_rule_id: numberingRuleId,
      title: input.title,
      summary: input.summary,
      priority_level: input.priorityLevel,
      confidential_level: input.confidentialLevel,
      visibility_scope: input.visibilityScope,
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
