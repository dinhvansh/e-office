import { PrismaClient } from "@prisma/client";
import { ApiError } from "../../core/errors/api-error";

const prisma = new PrismaClient();

export class VersionsService {
  async createVersion(
    documentId: number,
    data: {
      file_path: string;
      version_no: number;
      comment?: string;
      uploaded_by: number;
    },
    tenantId: number
  ) {
    // Verify document belongs to tenant
    const doc = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!doc) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    return prisma.document_versions.create({
      data: {
        document_id: documentId,
        file_path: data.file_path,
        version_no: data.version_no,
        comment: data.comment,
        uploaded_by: data.uploaded_by,
      },
    });
  }

  async getDocumentVersions(documentId: number, tenantId: number) {
    // Verify document belongs to tenant
    const doc = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!doc) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    return prisma.document_versions.findMany({
      where: { document_id: documentId },
      orderBy: { version_no: "desc" },
    });
  }

  async getLatestVersion(documentId: number, tenantId: number) {
    // Verify document belongs to tenant
    const doc = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!doc) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    return prisma.document_versions.findFirst({
      where: { document_id: documentId },
      orderBy: { version_no: "desc" },
    });
  }

  async getVersionById(versionId: number, tenantId: number) {
    const version = await prisma.document_versions.findUnique({
      where: { id: versionId },
      include: {
        document: true,
      },
    });

    if (!version || version.document.tenant_id !== tenantId) {
      throw ApiError.notFound("Version not found", "VERSION_NOT_FOUND");
    }

    return version;
  }

  async getNextVersionNumber(documentId: number): Promise<number> {
    const latest = await prisma.document_versions.findFirst({
      where: { document_id: documentId },
      orderBy: { version_no: "desc" },
    });

    return latest ? latest.version_no + 1 : 1;
  }
}

export const versionsService = new VersionsService();
