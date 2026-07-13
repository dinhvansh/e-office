import { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../../core/errors/api-error";
import { assertDocumentStatusTransition } from "./workflowState.policy";

type DbClient = PrismaClient | Prisma.TransactionClient;

class WorkflowStateService {
  async transitionDocument(
    db: DbClient,
    input: { documentId: number; status: string; signedFilePath?: string; hash?: string },
  ): Promise<void> {
    const document = await db.documents.findUnique({
      where: { id: input.documentId },
      select: { status: true },
    });
    if (!document) throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    try {
      assertDocumentStatusTransition(document.status, input.status);
    } catch {
      throw ApiError.conflict("Invalid workflow status transition", "WORKFLOW_TRANSITION_INVALID");
    }
    await db.documents.update({
      where: { id: input.documentId },
      data: {
        status: input.status,
        ...(input.signedFilePath ? { signed_file_path: input.signedFilePath } : {}),
        ...(input.hash ? { hash: input.hash } : {}),
      },
    });
  }

  async transitionSigningPair(
    db: DbClient,
    input: {
      documentId: number;
      signRequestId: number;
      documentStatus: string;
      signRequestStatus: string;
      signedFilePath?: string;
      hash?: string;
    },
  ): Promise<void> {
    await this.transitionDocument(db, {
      documentId: input.documentId,
      status: input.documentStatus,
      signedFilePath: input.signedFilePath,
      hash: input.hash,
    });
    await db.sign_requests.update({
      where: { id: input.signRequestId },
      data: { status: input.signRequestStatus },
    });
  }
}

export const workflowStateService = new WorkflowStateService();
