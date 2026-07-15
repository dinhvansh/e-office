import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";


export class TagsService {
  async addTag(documentId: number, tag: string, tenantId: number) {
    // Verify document belongs to tenant
    const doc = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!doc) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    // Add tag (ignore if already exists)
    await prisma.document_tags.upsert({
      where: {
        document_id_tag: {
          document_id: documentId,
          tag: tag.toLowerCase().trim(),
        },
      },
      update: {},
      create: {
        document_id: documentId,
        tag: tag.toLowerCase().trim(),
      },
    });

    return this.getDocumentTags(documentId);
  }

  async removeTag(documentId: number, tag: string, tenantId: number) {
    // Verify document belongs to tenant
    const doc = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!doc) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    await prisma.document_tags.delete({
      where: {
        document_id_tag: {
          document_id: documentId,
          tag: tag.toLowerCase().trim(),
        },
      },
    });

    return this.getDocumentTags(documentId);
  }

  async getDocumentTags(documentId: number) {
    const tags = await prisma.document_tags.findMany({
      where: { document_id: documentId },
      orderBy: { tag: "asc" },
    });
    return tags.map((t) => t.tag);
  }

  async getAllTags(tenantId: number) {
    // Get all unique tags for tenant's documents
    const tags = await prisma.document_tags.findMany({
      where: {
        document: {
          tenant_id: tenantId,
        },
      },
      distinct: ["tag"],
      orderBy: { tag: "asc" },
    });
    return tags.map((t) => t.tag);
  }

  async getDocumentsByTag(tag: string, tenantId: number) {
    const docs = await prisma.documents.findMany({
      where: {
        tenant_id: tenantId,
        tags: {
          some: {
            tag: tag.toLowerCase().trim(),
          },
        },
      },
      include: {
        tags: true,
      },
      orderBy: { created_at: "desc" },
    });
    return docs;
  }
}

export const tagsService = new TagsService();
