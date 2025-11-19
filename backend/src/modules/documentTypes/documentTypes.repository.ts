import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const documentTypesRepository = {
  async findByTenant(tenantId: number, filters?: { category?: string; is_active?: boolean }) {
    const where: any = { tenant_id: tenantId };

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

  async create(data: any) {
    return prisma.document_types.create({
      data,
      include: {
        numbering_rules: true,
      },
    });
  },

  async update(id: number, data: any) {
    return prisma.document_types.update({
      where: { id },
      data,
      include: {
        numbering_rules: true,
      },
    });
  },

  async delete(id: number) {
    return prisma.document_types.delete({
      where: { id },
    });
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
