import { audit_logs } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";

export interface AuditLogPayload {
  tenantId: number;
  documentId: number;
  event: string;
  userId?: number;
  ip?: string;
  ua?: string;
}

export class AuditService {
  async record(payload: AuditLogPayload): Promise<audit_logs> {
    const document = await prisma.documents.findFirst({
      where: { id: payload.documentId, tenant_id: payload.tenantId },
    });
    if (!document) {
      throw ApiError.notFound("Document not found for audit logging", "DOCUMENT_NOT_FOUND");
    }
    return prisma.audit_logs.create({
      data: {
        document_id: payload.documentId,
        event: payload.event,
        user_id: payload.userId,
        ip: payload.ip,
        ua: payload.ua,
      },
    });
  }

  async listDocumentLogs(documentId: number, tenantId: number): Promise<audit_logs[]> {
    const document = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }
    return prisma.audit_logs.findMany({
      where: { document_id: documentId },
      orderBy: { created_at: "desc" },
    });
  }
}

export const auditService = new AuditService();
