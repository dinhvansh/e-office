import { prisma } from '../../config/prisma';

export const positionsRepository = {
  async findByTenant(tenantId: number, filters?: any) {
    return prisma.positions.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters?.is_active !== undefined && { is_active: filters.is_active }),
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: [
        { level: 'asc' },
        { name: 'asc' },
      ],
    });
  },

  async findById(id: number, tenantId: number) {
    return prisma.positions.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  },

  async findByCode(code: string, tenantId: number) {
    return prisma.positions.findFirst({
      where: {
        code,
        tenant_id: tenantId,
      },
    });
  },

  async create(data: {
    tenant_id: number;
    code: string;
    name: string;
    description?: string;
    level?: number;
    is_active?: boolean;
  }) {
    return prisma.positions.create({
      data,
    });
  },

  async update(id: number, data: {
    name?: string;
    description?: string;
    level?: number;
    is_active?: boolean;
  }) {
    return prisma.positions.update({
      where: { id },
      data,
    });
  },

  async delete(id: number) {
    return prisma.positions.delete({
      where: { id },
    });
  },

  async getStats(tenantId: number) {
    const total = await prisma.positions.count({
      where: { tenant_id: tenantId },
    });

    const active = await prisma.positions.count({
      where: { tenant_id: tenantId, is_active: true },
    });

    return { total, active, inactive: total - active };
  },
};
