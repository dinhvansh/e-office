import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { documentLifecycleService } from "../documents/documentLifecycle.service";

class ArchiveService {
  async list(tenantId: number, search?: string) {
    return prisma.documents.findMany({
      where: { tenant_id: tenantId, status: "archived", ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { document_number: { contains: search, mode: "insensitive" } }] } : {}) },
      include: { sign_request: { select: { id: true, status: true } } },
      orderBy: { archived_at: "desc" },
    });
  }
  async get(tenantId: number, id: number) {
    const document = await prisma.documents.findFirst({ where: { id, tenant_id: tenantId, status: "archived" }, include: { sign_request: { include: { signers: true } }, approvals: true, workflow_instances: true } });
    if (!document) throw ApiError.notFound("Archived document not found", "ARCHIVE_NOT_FOUND");
    return document;
  }
  async restore(tenantId: number, id: number, userId: number) {
    const document = await this.get(tenantId, id);
    await documentLifecycleService.restore(document, userId);
    return { status: "cancelled" };
  }
}
export const archiveService = new ArchiveService();
