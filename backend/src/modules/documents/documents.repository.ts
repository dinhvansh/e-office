import { documents } from "@prisma/client";
import { prisma } from "../../config/prisma";

export interface CreateDocumentData {
  tenant_id: number;
  owner_id: number;
  file_path: string;
  original_file_name?: string | null;
  hash?: string | null;
  status?: string | null;
  version?: number;
  document_type_id?: number | null;
  department_id?: number | null;
  document_number?: string | null;
  numbering_rule_id?: number | null;
  title?: string | null;
  summary?: string | null;
  priority_level?: string | null;
  confidential_level?: string | null;
  visibility_scope?: string | null;
  sign_request_id?: number | null;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class DocumentsRepository {
  async listByTenant(tenantId: number, noSigningOnly = false): Promise<documents[]> {
    const whereClause: any = { tenant_id: tenantId };
    
    if (noSigningOnly) {
      // Only documents whose document type doesn't require digital signing
      whereClause.document_type = {
        require_digital_signing: false
      };
    }
    
    return prisma.documents.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
    });
  }

  async listByTenantPaginated(
    tenantId: number,
    params: PaginationParams = {},
    noSigningOnly = false,
    status?: string,
    search?: string
  ): Promise<PaginatedResult<documents>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { tenant_id: tenantId };
    
    if (noSigningOnly) {
      // Only documents whose document type doesn't require digital signing
      whereClause.document_type = {
        require_digital_signing: false
      };
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { original_file_name: { contains: search, mode: 'insensitive' } },
        { document_number: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.documents.findMany({
        where: whereClause,
        include: {
          document_type: true,
          owner: {
            select: {
              id: true,
              full_name: true,
              email: true,
            }
          }
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.documents.count({
        where: whereClause,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

  update(id: number, data: Partial<CreateDocumentData>): Promise<documents> {
    return prisma.documents.update({
      where: { id },
      data,
    });
  }
}

export const documentsRepository = new DocumentsRepository();
