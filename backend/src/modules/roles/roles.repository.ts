import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const rolesRepository = {
  async findByTenant(tenantId: number) {
    return prisma.roles.findMany({
      where: { tenant_id: tenantId },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { user_roles: true },
        },
      },
      orderBy: { id: 'desc' }, // Newest first
    });
  },

  async findById(id: number, tenantId: number) {
    return prisma.roles.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
        user_roles: {
          include: {
            user: {
              select: { id: true, email: true, full_name: true },
            },
          },
        },
      },
    });
  },

  async create(data: any) {
    return prisma.roles.create({
      data,
    });
  },

  async update(id: number, data: any) {
    return prisma.roles.update({
      where: { id },
      data,
    });
  },

  async delete(id: number) {
    return prisma.roles.delete({
      where: { id },
    });
  },

  async assignPermissions(roleId: number, permissionIds: number[]) {
    // Delete existing permissions
    await prisma.role_permissions.deleteMany({
      where: { role_id: roleId },
    });

    // Create new permissions
    if (permissionIds.length > 0) {
      await prisma.role_permissions.createMany({
        data: permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
        })),
      });
    }
  },

  async getAllPermissions() {
    return prisma.permissions.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  },

  async getUserPermissions(userId: number) {
    const userRoles = await prisma.user_roles.findMany({
      where: { user_id: userId },
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
    });

    // Collect all unique permissions
    const permissionsMap = new Map();
    userRoles.forEach(ur => {
      ur.role.role_permissions.forEach(rp => {
        const key = `${rp.permission.resource}:${rp.permission.action}`;
        permissionsMap.set(key, rp.permission);
      });
    });

    return Array.from(permissionsMap.values());
  },

  async checkPermission(userId: number, resource: string, action: string) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(p => p.resource === resource && p.action === action);
  },

  async removePermission(roleId: number, permissionId: number) {
    return prisma.role_permissions.deleteMany({
      where: {
        role_id: roleId,
        permission_id: permissionId,
      },
    });
  },

  async getRoleUsers(roleId: number, tenantId: number) {
    const userRoles = await prisma.user_roles.findMany({
      where: {
        role_id: roleId,
        user: {
          tenant_id: tenantId,
        },
      },
      include: {
        user: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });

    return userRoles.map(ur => ur.user);
  },
};
