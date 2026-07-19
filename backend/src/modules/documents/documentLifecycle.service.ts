import { documents } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { workflowCancellationService } from "../workflows/workflowCancellation.service";

class DocumentLifecycleService {
  async archive(document: documents, userId = 0, reason?: string): Promise<void> {
    if (document.status === "archived") throw ApiError.badRequest("Document is already archived", "DOCUMENT_ARCHIVED");
    await prisma.$transaction(async (tx) => {
      await tx.documents.update({ where: { id: document.id }, data: { status: "archived", archived_at: new Date(), archived_by: userId, archive_reason: reason || null, previous_status: document.status } });
      if (document.sign_request_id) await tx.sign_requests.update({ where: { id: document.sign_request_id }, data: { status: "archived", archived_at: new Date(), archived_by: userId, archive_reason: reason || null, previous_status: document.status } });
      await tx.workflow_instances.updateMany({ where: { document_id: document.id, status: "in_progress" }, data: { status: "cancelled", completed_at: new Date() } });
      await tx.audit_logs.create({ data: { document_id: document.id, event: "DOCUMENT_ARCHIVED", user_id: userId, ip: null, ua: null } });
    });
  }

  async restore(document: documents, userId: number): Promise<void> {
    if (document.status !== "archived") throw ApiError.badRequest("Document is not archived", "DOCUMENT_NOT_ARCHIVED");
    await prisma.$transaction(async (tx) => {
      await tx.documents.update({ where: { id: document.id }, data: { status: "cancelled", archived_at: null, archived_by: null, archive_reason: null } });
      if (document.sign_request_id) await tx.sign_requests.update({ where: { id: document.sign_request_id }, data: { status: "cancelled", archived_at: null, archived_by: null, archive_reason: null } });
      await tx.audit_logs.create({ data: { document_id: document.id, event: "DOCUMENT_RESTORED", user_id: userId, ip: null, ua: null } });
    });
  }

  async cancel(document: documents, userId: number): Promise<void> {
    await workflowCancellationService.cancel({ documentId: document.id, tenantId: document.tenant_id, userId });
  }
}

export const documentLifecycleService = new DocumentLifecycleService();
