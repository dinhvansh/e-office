import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

type RoleData = Pick<Prisma.rolesCreateInput, 'name' | 'description' | 'is_system'> & {
  tenant_id: number;
};


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

  async create(data: RoleData) {
    return prisma.roles.create({
      data,
    });
  },

  async update(id: number, tenantId: number, data: Prisma.rolesUpdateInput) {
    const updated = await prisma.roles.updateMany({
      where: { id, tenant_id: tenantId },
      data,
    });
    if (updated.count !== 1) throw new Error('Role not found');
  },

  async delete(id: number, tenantId: number) {
    const deleted = await prisma.roles.deleteMany({ where: { id, tenant_id: tenantId } });
    if (deleted.count !== 1) throw new Error('Role not found');
  },

  async assignPermissions(roleId: number, tenantId: number, permissionIds: number[]) {
    // Delete existing permissions
    await prisma.role_permissions.deleteMany({
      where: { role_id: roleId, role: { tenant_id: tenantId } },
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
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'super_admin') {
      return true;
    }

    const permissions = await this.getUserPermissions(userId);
    return permissions.some(p => p.resource === resource && p.action === action);
  },

  async removePermission(roleId: number, permissionId: number, tenantId: number) {
    return prisma.role_permissions.deleteMany({
      where: {
        role_id: roleId,
        permission_id: permissionId,
        role: { tenant_id: tenantId },
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
