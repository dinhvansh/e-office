import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export interface PositionFilters {
  is_active?: boolean;
}

export const positionsRepository = {
  async findByTenant(tenantId: number, filters?: PositionFilters) {
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

  async findByTenantPaginated(tenantId: number, options: {
    page: number;
    limit: number;
    is_active?: boolean;
  }) {
    const { page, limit, is_active } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.positionsWhereInput = { tenant_id: tenantId };
    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const [positions, total] = await Promise.all([
      prisma.positions.findMany({
        where,
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy: [
          { level: 'asc' },
          { name: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.positions.count({ where }),
    ]);

    return {
      positions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
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
