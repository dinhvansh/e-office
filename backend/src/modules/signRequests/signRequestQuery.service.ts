import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { authorizationService } from "../authorization/authorization.service";
import { signRequestsRepository } from "./signRequests.repository";
import { buildSignRequestFlowHints } from "./signRequestFlow.policy";
import type { SignRequestFlowSigner } from "./signRequestFlow.policy";

class SignRequestQueryService {
  async listSignRequests(tenantId: number, userId: number) {
    const signRequests = await signRequestsRepository.listByTenant(tenantId);
    const decisions = await Promise.all(signRequests.map(async (signRequest) => {
      const access = await authorizationService.canAccessDocument(userId, tenantId, signRequest.document_id, "read");
      return access.allowed ? signRequest : null;
    }));
    return decisions.filter((signRequest): signRequest is NonNullable<typeof signRequest> => !!signRequest);
  }

  async getMySignRequests(userId: number, tenantId: number, status?: string, page = 1, limit = 10) {
    const where: Prisma.sign_requestsWhereInput = { tenant_id: tenantId, status: { not: "archived" }, document: { owner_id: userId, status: { not: "archived" } } };
    if (status === "pending") where.status = { in: ["pending_approval", "pending", "in_progress"] };
    else if (status) where.status = status;
    const total = await prisma.sign_requests.count({ where });
    const totalPages = Math.ceil(total / limit);
    const signRequests = await signRequestsRepository.findMany({
      where,
      include: { document: { select: { id: true, title: true, original_file_name: true, document_number: true, status: true, owner: { select: { id: true, full_name: true, email: true } } } }, signers: { select: { id: true, name: true, email: true, status: true, signed_at: true, signing_order: true, is_internal: true, user_id: true }, orderBy: { signing_order: "asc" } } },
      orderBy: { created_at: "desc" }, skip: (page - 1) * limit, take: limit,
    });
    return { data: signRequests.map((request) => {
      const flowRequest = request as typeof request & { signers: SignRequestFlowSigner[] };
      return { ...flowRequest, ...buildSignRequestFlowHints(flowRequest.status, flowRequest.signers) };
    }), pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } };
  }
}

export const signRequestQueryService = new SignRequestQueryService();
