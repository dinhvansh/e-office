import { documents } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { workflowCancellationService } from "../workflows/workflowCancellation.service";
import { canArchiveDocumentStatus } from "./documentLifecycle.policy";

export class DocumentLifecycleService {
  constructor(private readonly database = prisma) {}

  async archive(document: documents, userId = 0, reason?: string): Promise<void> {
    if (!canArchiveDocumentStatus(document.status)) {
      throw ApiError.badRequest(
        "Only rejected or cancelled documents can be archived",
        "DOCUMENT_ARCHIVE_DENIED_STATUS",
      );
    }

    await this.database.$transaction(async (tx) => {
      const [activeRunCount, signRequests] = await Promise.all([
        tx.workflow_instances.count({ where: { document_id: document.id, status: "in_progress" } }),
        tx.sign_requests.findMany({
          where: { document_id: document.id },
          select: { id: true, status: true },
        }),
      ]);
      if (activeRunCount > 0) {
        throw ApiError.badRequest(
          "Cancel the active workflow before archiving this document",
          "DOCUMENT_ARCHIVE_ACTIVE_WORKFLOW",
        );
      }
      const invalidRequest = signRequests.find(
        (request) => !canArchiveDocumentStatus(request.status),
      );
      if (invalidRequest) {
        throw ApiError.badRequest(
          "Only rejected or cancelled sign requests can be archived",
          "SIGN_REQUEST_ARCHIVE_DENIED_STATUS",
        );
      }

      const archivedAt = new Date();
      await tx.documents.update({ where: { id: document.id }, data: { status: "archived", archived_at: archivedAt, archived_by: userId, archive_reason: reason || null, previous_status: document.status } });
      for (const signRequest of signRequests) {
        await tx.sign_requests.update({
          where: { id: signRequest.id },
          data: { status: "archived", archived_at: archivedAt, archived_by: userId, archive_reason: reason || null, previous_status: signRequest.status },
        });
      }
      await tx.audit_logs.create({ data: { document_id: document.id, event: "DOCUMENT_ARCHIVED", user_id: userId, ip: null, ua: null } });
    });
  }

  async restore(document: documents, userId: number): Promise<void> {
    if (document.status !== "archived") throw ApiError.badRequest("Document is not archived", "DOCUMENT_NOT_ARCHIVED");
    await this.database.$transaction(async (tx) => {
      await tx.documents.update({ where: { id: document.id }, data: { status: "cancelled", archived_at: null, archived_by: null, archive_reason: null } });
      await tx.sign_requests.updateMany({ where: { document_id: document.id, status: "archived" }, data: { status: "cancelled", archived_at: null, archived_by: null, archive_reason: null } });
      await tx.audit_logs.create({ data: { document_id: document.id, event: "DOCUMENT_RESTORED", user_id: userId, ip: null, ua: null } });
    });
  }

  async cancel(document: documents, userId: number): Promise<void> {
    await workflowCancellationService.cancel({ documentId: document.id, tenantId: document.tenant_id, userId });
  }
}

export const documentLifecycleService = new DocumentLifecycleService();
