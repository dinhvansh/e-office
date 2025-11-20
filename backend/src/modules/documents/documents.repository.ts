import { documents } from "@prisma/client";
import { prisma } from "../../config/prisma";

export interface CreateDocumentData {
  tenant_id: number;
  owner_id: number;
  file_path: string;
  hash?: string | null;
  status?: string | null;
  version?: number;
  document_type_id?: number | null;
  document_number?: string | null;
  numbering_rule_id?: number | null;
  title?: string | null;
  summary?: string | null;
  priority_level?: string | null;
  confidential_level?: string | null;
  visibility_scope?: string | null;
}

export class DocumentsRepository {
  listByTenant(tenantId: number): Promise<documents[]> {
    return prisma.documents.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" },
    });
  }

  findById(id: number, tenantId: number): Promise<documents | null> {
    return prisma.documents.findFirst({ where: { id, tenant_id: tenantId } });
  }

  create(data: CreateDocumentData): Promise<documents> {
    return prisma.documents.create({ data });
  }

  delete(id: number): Promise<documents> {
    return prisma.documents.delete({
      where: { id },
    });
  }
}

export const documentsRepository = new DocumentsRepository();
