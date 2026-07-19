import { documents } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { workflowCancellationService } from "../workflows/workflowCancellation.service";

class DocumentLifecycleService {
  async archive(document: documents): Promise<void> {
    if (document.status !== "completed") {
      throw ApiError.badRequest("Only completed documents can be archived", "DOCUMENT_NOT_COMPLETED");
    }
    await prisma.documents.update({ where: { id: document.id }, data: { status: "archived" } });
  }

  async cancel(document: documents, userId: number): Promise<void> {
    await workflowCancellationService.cancel({ documentId: document.id, tenantId: document.tenant_id, userId });
  }
}

export const documentLifecycleService = new DocumentLifecycleService();
