import { documents, Prisma } from "@prisma/client";
import { DbClient, prisma } from "../../config/prisma";

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
  async listByTenant(tenantId: number, noSigningOnly = false, db: DbClient = prisma): Promise<documents[]> {
    const whereClause: Prisma.documentsWhereInput = { tenant_id: tenantId, status: { not: 'archived' } };
    
    if (noSigningOnly) {
      // Only documents whose document type doesn't require digital signing
      whereClause.document_type = {
        require_digital_signing: false
      };
    }
    
    return db.documents.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
    });
  }

  async listByTenantPaginated(
    tenantId: number,
    params: PaginationParams = {},
    noSigningOnly = false,
    status?: string,
    search?: string,
    documentTypeId?: number,
    confidentialLevel?: string,
    db: DbClient = prisma,
  ): Promise<PaginatedResult<documents>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.documentsWhereInput = { tenant_id: tenantId, ...(status ? {} : { status: { not: 'archived' } }) };
    
    if (noSigningOnly) {
      // Only documents whose document type doesn't require digital signing
      whereClause.document_type = {
        require_digital_signing: false
      };
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (documentTypeId) {
      whereClause.document_type_id = documentTypeId;
    }
    
    if (confidentialLevel) {
      whereClause.confidential_level = confidentialLevel;
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
      db.documents.findMany({
        where: whereClause,
        include: {
          document_type: true,
          department: { select: { id: true, code: true, manager_id: true } },
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
      db.documents.count({
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

  async listByTenantForAccess(
    tenantId: number,
    noSigningOnly = false,
    status?: string,
    search?: string,
    documentTypeId?: number,
    confidentialLevel?: string,
    db: DbClient = prisma,
  ) {
    const whereClause: Prisma.documentsWhereInput = { tenant_id: tenantId };

    if (noSigningOnly) whereClause.document_type = { require_digital_signing: false };
    if (status) whereClause.status = status;
    if (documentTypeId) whereClause.document_type_id = documentTypeId;
    if (confidentialLevel) whereClause.confidential_level = confidentialLevel;
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { original_file_name: { contains: search, mode: "insensitive" } },
        { document_number: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    return db.documents.findMany({
      where: whereClause,
      include: {
        document_type: true,
        department: { select: { id: true, code: true, manager_id: true, support_managers: { select: { user_id: true } } } },
        owner: { select: { id: true, manager_id: true, department_id: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }

  findById(id: number, tenantId: number, db: DbClient = prisma): Promise<documents | null> {
    return db.documents.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        cc_emails: true,
        attachments: true,
        document_type: true,
        owner: {
          select: {
            id: true,
            full_name: true,
            email: true,
          }
        }
      }
    });
  }

  create(data: CreateDocumentData, db: DbClient = prisma): Promise<documents> {
    return db.documents.create({ data });
  }

  delete(id: number, db: DbClient = prisma): Promise<documents> {
    return db.documents.delete({
      where: { id },
    });
  }

  update(id: number, data: Partial<CreateDocumentData>, db: DbClient = prisma): Promise<documents> {
    return db.documents.update({
      where: { id },
      data,
    });
  }
}

export const documentsRepository = new DocumentsRepository();
