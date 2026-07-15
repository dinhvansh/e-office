import { Prisma } from "@prisma/client";
import { signRequestsRepository } from "./signRequests.repository";

export interface CreateDraftSignRequestInput {
  document_id: number;
  tenant_id: number;
  title?: string;
  auto_created?: boolean;
}

class SignRequestDraftService {
  async createDraftSignRequest(data: CreateDraftSignRequestInput) {
    const signRequestData: Prisma.sign_requestsCreateInput = {
      tenant: { connect: { id: data.tenant_id } },
      document: { connect: { id: data.document_id } },
      title: data.title,
      workflow_type: "sequential",
      status: "draft",
      auto_created: data.auto_created || false,
    };
    return signRequestsRepository.create(signRequestData);
  }
}

export const signRequestDraftService = new SignRequestDraftService();
