import { departmentsRepository } from './departments.repository';
import { throwError, throwNotFound } from '../../utils/errors';

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
      throwNotFound('DEPARTMENT_NOT_FOUND');
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
    // Check if code already exists
    if (data.code) {
      const existing = await departmentsRepository.findByCode(tenantId, data.code);
      if (existing) {
        throwError('DEPARTMENT_CODE_DUPLICATE');
      }
    }

    // Validate parent department exists
    if (data.parent_id) {
      const parent = await departmentsRepository.findById(data.parent_id, tenantId);
      if (!parent) {
        throwNotFound('DEPARTMENT_PARENT_NOT_FOUND');
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
      throwNotFound('DEPARTMENT_NOT_FOUND');
    }

    // Check if code already exists (for other department)
    if (data.code && data.code !== existing.code) {
      const duplicate = await departmentsRepository.findByCode(tenantId, data.code);
      if (duplicate && duplicate.id !== id) {
        throwError('DEPARTMENT_CODE_DUPLICATE');
      }
    }

    // Prevent circular reference
    if (data.parent_id === id) {
      throwError('DEPARTMENT_CIRCULAR_REFERENCE');
    }

    // Validate parent department exists
    if (data.parent_id) {
      const parent = await departmentsRepository.findById(data.parent_id, tenantId);
      if (!parent) {
        throwNotFound('DEPARTMENT_PARENT_NOT_FOUND');
      }
    }

    return departmentsRepository.update(id, tenantId, data);
  },

  async deleteDepartment(id: number, tenantId: number) {
    return departmentsRepository.delete(id, tenantId);
  },
};
