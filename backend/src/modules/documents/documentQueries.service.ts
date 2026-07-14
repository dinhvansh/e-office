import { documents } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { documentPermissionResolverService } from "../authorization/document-permission-resolver.service";
import { authorizationService } from "../authorization/authorization.service";
import { rolesService } from "../roles/roles.service";
import { paginateAccessibleItems } from "./documentAccessPagination";
import { documentsRepository } from "./documents.repository";

class DocumentQueriesService {
  async listDocuments(tenantId: number, userId?: number, noSigningOnly = false): Promise<documents[]> {
    if (!userId) return documentsRepository.listByTenant(tenantId, noSigningOnly);

    const user = await prisma.users.findUnique({ where: { id: userId }, select: { tenant_id: true } });
    if (!user || user.tenant_id !== tenantId) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }

    const candidates = await documentsRepository.listByTenantForAccess(tenantId, noSigningOnly);
    const decisions = await documentPermissionResolverService.resolveDocumentPermissionsBatch(userId, tenantId, candidates);
    return candidates.filter((document) => decisions.get(document.id)?.canView);
  }

  async listDocumentsPaginated(
    tenantId: number,
    userId: number | undefined,
    page = 1,
    limit = 10,
    noSigningOnly = false,
    status?: string,
    search?: string,
    documentTypeId?: number,
    confidentialLevel?: string,
  ) {
    if (!userId) {
      return documentsRepository.listByTenantPaginated(tenantId, { page, limit }, noSigningOnly, status, search, documentTypeId, confidentialLevel);
    }
    const hasModulePermission = await rolesService.checkPermission(userId, "documents", "read");
    if (!hasModulePermission) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    const candidates = await documentsRepository.listByTenantForAccess(tenantId, noSigningOnly, status, search, documentTypeId, confidentialLevel);
    const decisions = await documentPermissionResolverService.resolveDocumentPermissionsBatch(userId, tenantId, candidates);
    return paginateAccessibleItems(candidates.filter((document) => decisions.get(document.id)?.canView), page, limit);
  }

  async getDocument(documentId: number, tenantId: number, userId?: number): Promise<documents> {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document) throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    if (!userId) return document;

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user || user.tenant_id !== tenantId) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }
    const decision = await authorizationService.canAccessDocument(userId, tenantId, documentId, "read");
    if (!decision.allowed) {
      throw ApiError.forbidden("You do not have access to this document", "DOCUMENT_ACCESS_DENIED");
    }
    return documentsRepository.findById(document.id, tenantId) || document;
  }
}

export const documentQueriesService = new DocumentQueriesService();
