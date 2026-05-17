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

  async listAuthorizationDecisions(
    tenantId: number,
    params?: {
      userId?: number;
      documentId?: number;
      action?: string;
      limit?: number;
    }
  ): Promise<audit_logs[]> {
    const where: any = {
      event: { startsWith: "authz.document." },
      document: { tenant_id: tenantId },
    };
    if (params?.userId) where.user_id = params.userId;
    if (params?.documentId) where.document_id = params.documentId;
    if (params?.action) where.event = { startsWith: `authz.document.${params.action}.` };

    return prisma.audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: params?.limit && params.limit > 0 ? Math.min(params.limit, 500) : 100,
    });
  }
}

export const auditService = new AuditService();
