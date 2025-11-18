import { Prisma, sign_requests } from "@prisma/client";
import { ApiError } from "../../core/errors/api-error";
import { auditService } from "../audit/audit.service";
import { documentsRepository } from "../documents/documents.repository";
import { licenseService } from "../licenses/license.service";
import { signersRepository } from "../signers/signers.repository";
import { webhookService } from "../webhooks/webhooks.service";
import { signRequestsRepository } from "./signRequests.repository";

export interface SignerInput {
  email: string;
  name: string;
  role?: string;
  position_data?: Record<string, unknown>;
}

export interface CreateSignRequestInput {
  document_id: number;
  title?: string;
  message?: string;
  workflow_type?: string;
  deadline?: Date | null;
  signers: SignerInput[];
}

class SignRequestsService {
  async listSignRequests(tenantId: number) {
    return signRequestsRepository.listByTenant(tenantId);
  }

  async createSignRequest(tenantId: number, userId: number, input: CreateSignRequestInput) {
    await licenseService.ensureLicenseForTenant(tenantId);
    const document = await documentsRepository.findById(input.document_id, tenantId);
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    const signRequestData: Prisma.sign_requestsCreateInput = {
      tenant: { connect: { id: tenantId } },
      document: { connect: { id: document.id } },
      title: input.title,
      message: input.message,
      workflow_type: input.workflow_type ?? "sequential",
      status: "draft",
      deadline: input.deadline ?? null,
    };
    const signRequest = await signRequestsRepository.create(signRequestData);

    if (input.signers?.length) {
      await signersRepository.createMany(
        input.signers.map((signer) => ({
          sign_request_id: signRequest.id,
          email: signer.email,
          name: signer.name,
          role: signer.role,
          status: "pending",
          position_data: signer.position_data ? (signer.position_data as Prisma.InputJsonValue) : undefined,
        })),
      );
    }

    await auditService.record({
      tenantId,
      documentId: document.id,
      event: "sign.started",
      userId,
    });
    await webhookService.emit(tenantId, "sign.started", {
      sign_request_id: signRequest.id,
      document_id: document.id,
    });

    return this.getSignRequest(signRequest.id, tenantId);
  }

  async getSignRequest(id: number, tenantId: number) {
    const signRequest = await signRequestsRepository.findById(id, tenantId);
    if (!signRequest) {
      throw ApiError.notFound("Sign request not found", "SIGN_REQUEST_NOT_FOUND");
    }
    return signRequest;
  }

  async cancelSignRequest(id: number, tenantId: number, userId: number) {
    const signRequest = await this.getSignRequest(id, tenantId);
    if (signRequest.status === "completed") {
      throw ApiError.badRequest("Cannot cancel a completed request", "SIGN_REQUEST_COMPLETED");
    }
    await signRequestsRepository.updateStatus(id, tenantId, "cancelled");
    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign.cancelled",
      userId,
    });
    await webhookService.emit(tenantId, "sign.declined", {
      sign_request_id: signRequest.id,
      document_id: signRequest.document_id,
    });
  }
}

export const signRequestsService = new SignRequestsService();
