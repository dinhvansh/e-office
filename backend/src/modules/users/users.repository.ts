import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const usersRepository = {
  async findByTenant(tenantId: number | null, filters?: {
    department_id?: number;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = tenantId !== null ? { tenant_id: tenantId } : {};

    if (filters?.department_id) {
      where.department_id = filters.department_id;
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { full_name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.users.findMany({
      where,
      include: {
        tenant: {
          select: { id: true, name: true, domain: true },
        },
        department: {
          select: { id: true, name: true },
        },
        position: {
          select: { id: true, code: true, name: true },
        },
        manager: {
          select: { id: true, email: true, full_name: true },
        },
        user_roles: {
          include: {
            role: {
              select: { id: true, name: true, description: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  },

  async findById(id: number, tenantId: number | null) {
    return prisma.users.findFirst({
      where: { 
        id, 
        ...(tenantId !== null && { tenant_id: tenantId })
      },
      include: {
        department: true,
        position: true,
        manager: {
          select: { id: true, email: true, full_name: true },
        },
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        managed_departments: true,
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.users.findUnique({
      where: { email },
    });
  },

  async create(data: any) {
    return prisma.users.create({
      data,
      include: {
        department: true,
        position: true,
        manager: {
          select: { id: true, email: true, full_name: true },
        },
        user_roles: true,
        managed_departments: true,
      },
    });
  },

  async update(id: number, data: any) {
    return prisma.users.update({
      where: { id },
      data,
      include: {
        department: true,
        position: true,
        manager: {
          select: { id: true, email: true, full_name: true },
        },
        user_roles: {
          include: {
            role: true,
          },
        },
        managed_departments: true,
      },
    });
  },

  async delete(id: number) {
    return prisma.users.delete({
      where: { id },
    });
  },

  async assignRoles(userId: number, roleIds: number[]) {
    // Delete existing roles
    await prisma.user_roles.deleteMany({
      where: { user_id: userId },
    });

    // Assign new roles
    if (roleIds.length > 0) {
      await prisma.user_roles.createMany({
        data: roleIds.map(roleId => ({
          user_id: userId,
          role_id: roleId,
        })),
      });
    }
  },

  async getUserStats(tenantId: number) {
    const total = await prisma.users.count({
      where: { tenant_id: tenantId },
    });

    const active = await prisma.users.count({
      where: { tenant_id: tenantId, status: 'active' },
    });

    const byDepartment = await prisma.users.groupBy({
      by: ['department_id'],
      where: { tenant_id: tenantId },
      _count: true,
    });

    return { total, active, byDepartment };
  },
};
