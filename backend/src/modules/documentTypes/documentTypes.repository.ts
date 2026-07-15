import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../core/errors/api-error';


export const documentTypesRepository = {
  async findByTenant(tenantId: number, filters?: { category?: string; is_active?: boolean }) {
    const where: Prisma.document_typesWhereInput = { tenant_id: tenantId };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    return prisma.document_types.findMany({
      where,
      include: {
        numbering_rules: true,
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: number, tenantId: number) {
    return prisma.document_types.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        numbering_rules: true,
        _count: {
          select: { documents: true },
        },
      },
    });
  },

  async findByCode(code: string, tenantId: number) {
    return prisma.document_types.findUnique({
      where: {
        tenant_id_code: {
          tenant_id: tenantId,
          code,
        },
      },
    });
  },

  async create(data: Prisma.document_typesUncheckedCreateInput) {
    return prisma.document_types.create({
      data,
      include: {
        numbering_rules: true,
      },
    });
  },

  async update(id: number, tenantId: number, data: Prisma.document_typesUncheckedUpdateInput) {
    const updated = await prisma.document_types.updateMany({
      where: { id, tenant_id: tenantId },
      data,
    });
    if (updated.count !== 1) throw ApiError.notFound('Document type not found', 'DOCUMENT_TYPE_NOT_FOUND');
    return prisma.document_types.findFirstOrThrow({ where: { id, tenant_id: tenantId }, include: { numbering_rules: true } });
  },

  async delete(id: number, tenantId: number) {
    const deleted = await prisma.document_types.deleteMany({ where: { id, tenant_id: tenantId } });
    if (deleted.count !== 1) throw ApiError.notFound('Document type not found', 'DOCUMENT_TYPE_NOT_FOUND');
  },

  async getStats(tenantId: number) {
    const total = await prisma.document_types.count({
      where: { tenant_id: tenantId },
    });

    const active = await prisma.document_types.count({
      where: { tenant_id: tenantId, is_active: true },
    });

    const byCategory = await prisma.document_types.groupBy({
      by: ['category'],
      where: { tenant_id: tenantId },
      _count: true,
    });

    return { total, active, byCategory };
  },
};
