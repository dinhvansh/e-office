import { audit_logs, Prisma } from "@prisma/client";
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

export type AuditLogListItem = audit_logs & {
  user?: {
    id: number;
    full_name: string | null;
    email: string;
  } | null;
};

export type DocumentAuditSummary = {
  totalViews: number;
  totalDownloads: number;
  totalSignedViews: number;
  totalSignedDownloads: number;
  totalAttachmentDownloads: number;
  viewers: Array<{
    user_id: number | null;
    full_name: string | null;
    email: string | null;
    views: number;
    downloads: number;
    signedViews: number;
    signedDownloads: number;
    attachmentDownloads: number;
    lastActivityAt: Date | null;
  }>;
};

export type DocumentAuditReport = {
  logs: AuditLogListItem[];
  summary: DocumentAuditSummary;
};

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

  async getDocumentAuditReport(documentId: number, tenantId: number): Promise<DocumentAuditReport> {
    const document = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    const logs = await prisma.audit_logs.findMany({
      where: { document_id: documentId },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const summaryMap = new Map<
      string,
      DocumentAuditSummary["viewers"][number]
    >();

    const ensureViewer = (log: AuditLogListItem) => {
      const key = log.user_id ? `user:${log.user_id}` : `anon:${log.ip || "unknown"}`;
      const existing = summaryMap.get(key);
      if (existing) {
        return existing;
      }

      const nextViewer = {
        user_id: log.user_id ?? null,
        full_name: log.user?.full_name ?? null,
        email: log.user?.email ?? null,
        views: 0,
        downloads: 0,
        signedViews: 0,
        signedDownloads: 0,
        attachmentDownloads: 0,
        lastActivityAt: log.created_at ?? null,
      };
      summaryMap.set(key, nextViewer);
      return nextViewer;
    };

    const summary: DocumentAuditSummary = {
      totalViews: 0,
      totalDownloads: 0,
      totalSignedViews: 0,
      totalSignedDownloads: 0,
      totalAttachmentDownloads: 0,
      viewers: [],
    };

    for (const log of logs) {
      const viewer = ensureViewer(log);
      if (!viewer.lastActivityAt || viewer.lastActivityAt < log.created_at) {
        viewer.lastActivityAt = log.created_at;
      }

      switch (log.event) {
        case "document.viewed":
          summary.totalViews += 1;
          viewer.views += 1;
          break;
        case "document.downloaded":
          summary.totalDownloads += 1;
          viewer.downloads += 1;
          break;
        case "document.signed_viewed":
          summary.totalSignedViews += 1;
          viewer.signedViews += 1;
          break;
        case "document.signed_downloaded":
          summary.totalSignedDownloads += 1;
          viewer.signedDownloads += 1;
          break;
        case "document.attachment_downloaded":
          summary.totalAttachmentDownloads += 1;
          viewer.attachmentDownloads += 1;
          break;
      }
    }

    summary.viewers = Array.from(summaryMap.values()).sort((a, b) => {
      const activityDiff =
        (b.views + b.downloads + b.signedViews + b.signedDownloads + b.attachmentDownloads) -
        (a.views + a.downloads + a.signedViews + a.signedDownloads + a.attachmentDownloads);
      if (activityDiff !== 0) return activityDiff;
      return (b.lastActivityAt?.getTime() || 0) - (a.lastActivityAt?.getTime() || 0);
    });

    return { logs, summary };
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
    const where: Prisma.audit_logsWhereInput = {
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
