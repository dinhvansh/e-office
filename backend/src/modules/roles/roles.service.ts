import { rolesRepository } from './roles.repository';

export const rolesService = {
  async getRoles(tenantId: number) {
    return rolesRepository.findByTenant(tenantId);
  },

  async getRoleById(id: number, tenantId: number) {
    const role = await rolesRepository.findById(id, tenantId);
    if (!role) {
      throw new Error('Role not found');
    }
    return role;
  },

  async createRole(tenantId: number, data: {
    name: string;
    description?: string;
    permission_ids?: number[];
  }) {
    const { permission_ids, ...roleData } = data;

    const role = await rolesRepository.create({
      ...roleData,
      tenant_id: tenantId,
      is_system: false,
    });

    if (permission_ids && permission_ids.length > 0) {
      await rolesRepository.assignPermissions(role.id, tenantId, permission_ids);
    }

    return rolesRepository.findById(role.id, tenantId);
  },

  async updateRole(id: number, tenantId: number, data: {
    name?: string;
    description?: string;
    permission_ids?: number[];
  }) {
    const existing = await rolesRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Role not found');
    }

    if (existing.is_system) {
      throw new Error('Cannot modify system role');
    }

    const { permission_ids, ...roleData } = data;

    if (Object.keys(roleData).length > 0) {
      await rolesRepository.update(id, tenantId, roleData);
    }

    if (permission_ids !== undefined) {
      await rolesRepository.assignPermissions(id, tenantId, permission_ids);
    }

    return rolesRepository.findById(id, tenantId);
  },

  async deleteRole(id: number, tenantId: number) {
    const existing = await rolesRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Role not found');
    }

    if (existing.is_system) {
      throw new Error('Cannot delete system role');
    }

    if (existing.user_roles.length > 0) {
      throw new Error('Cannot delete role with assigned users');
    }

    return rolesRepository.delete(id, tenantId);
  },

  async getAllPermissions() {
    return rolesRepository.getAllPermissions();
  },

  async getUserPermissions(userId: number) {
    return rolesRepository.getUserPermissions(userId);
  },

  async checkPermission(userId: number, resource: string, action: string) {
    return rolesRepository.checkPermission(userId, resource, action);
  },

  async removePermission(roleId: number, permissionId: number, tenantId: number) {
    const role = await rolesRepository.findById(roleId, tenantId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.is_system) {
      throw new Error('Cannot modify system role permissions');
    }

    return rolesRepository.removePermission(roleId, permissionId, tenantId);
  },

  async getRoleUsers(roleId: number, tenantId: number) {
    await this.getRoleById(roleId, tenantId);
    return rolesRepository.getRoleUsers(roleId, tenantId);
  },
};
