import { departmentsRepository } from './departments.repository';

export const departmentsService = {
  async getDepartments(tenantId: number) {
    return departmentsRepository.findByTenant(tenantId);
  },

  async getDepartmentTree(tenantId: number) {
    return departmentsRepository.getTree(tenantId);
  },

  async getDepartmentById(id: number, tenantId: number) {
    const department = await departmentsRepository.findById(id, tenantId);
    if (!department) {
      throw new Error('Department not found');
    }
    return department;
  },

  async createDepartment(tenantId: number, data: {
    name: string;
    code?: string;
    parent_id?: number;
    manager_id?: number;
    description?: string;
  }) {
    // Validate parent department exists
    if (data.parent_id) {
      const parent = await departmentsRepository.findById(data.parent_id, tenantId);
      if (!parent) {
        throw new Error('Parent department not found');
      }
    }

    return departmentsRepository.create({
      ...data,
      tenant_id: tenantId,
    });
  },

  async updateDepartment(id: number, tenantId: number, data: {
    name?: string;
    code?: string;
    parent_id?: number;
    manager_id?: number;
    description?: string;
  }) {
    // Check if department exists
    const existing = await departmentsRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Department not found');
    }

    // Prevent circular reference
    if (data.parent_id === id) {
      throw new Error('Department cannot be its own parent');
    }

    // Validate parent department exists
    if (data.parent_id) {
      const parent = await departmentsRepository.findById(data.parent_id, tenantId);
      if (!parent) {
        throw new Error('Parent department not found');
      }
    }

    return departmentsRepository.update(id, tenantId, data);
  },

  async deleteDepartment(id: number, tenantId: number) {
    return departmentsRepository.delete(id, tenantId);
  },
};
