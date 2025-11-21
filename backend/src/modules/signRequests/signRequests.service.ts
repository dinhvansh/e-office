import { Prisma, sign_requests } from "@prisma/client";
import * as crypto from "crypto";
import { ApiError } from "../../core/errors/api-error";
import { auditService } from "../audit/audit.service";
import { documentsRepository } from "../documents/documents.repository";
import { licenseService } from "../licenses/license.service";
import { signersRepository } from "../signers/signers.repository";
import { webhookService } from "../webhooks/webhooks.service";
import { signRequestsRepository } from "./signRequests.repository";
import { signRequestFieldsService } from "./signRequestFields.service";

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

  /**
   * Create draft sign request (auto-created by system)
   */
  async createDraftSignRequest(data: {
    document_id: number;
    tenant_id: number;
    title?: string;
    auto_created?: boolean;
  }) {
    const signRequestData: Prisma.sign_requestsCreateInput = {
      tenant: { connect: { id: data.tenant_id } },
      document: { connect: { id: data.document_id } },
      title: data.title,
      workflow_type: "sequential",
      status: "draft",
      auto_created: data.auto_created || false,
    };
    
    return await signRequestsRepository.create(signRequestData);
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

  async sendSignRequest(id: number, tenantId: number, userId: number) {
    const signRequest = await this.getSignRequest(id, tenantId);

    if (signRequest.status !== "draft") {
      throw ApiError.badRequest("Sign request already sent", "SIGN_REQUEST_ALREADY_SENT");
    }

    // Validate fields (if any exist)
    const fieldCount = await signRequestsRepository.countFields(id);
    if (fieldCount > 0) {
      const validation = await signRequestFieldsService.validateFieldsBeforeSend(id);
      if (!validation.valid) {
        throw ApiError.badRequest(validation.message || "Field validation failed");
      }
    }

    // Generate signing tokens for all signers
    const signers = await signersRepository.findBySignRequest(id);
    for (const signer of signers) {
      const token = crypto.randomBytes(32).toString("hex");
      await signersRepository.update(signer.id, { signing_token: token });
    }

    // Update status to pending
    await signRequestsRepository.updateStatus(id, tenantId, "pending");

    // TODO: Send email notifications with signing links

    await auditService.record({
      tenantId,
      documentId: signRequest.document_id,
      event: "sign.sent",
      userId,
    });

    return this.getSignRequest(id, tenantId);
  }
}

export const signRequestsService = new SignRequestsService();
