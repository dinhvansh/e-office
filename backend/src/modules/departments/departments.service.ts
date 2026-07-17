import { departmentsRepository } from './departments.repository';
import { throwError, throwNotFound } from '../../utils/errors';
import { prisma } from '../../config/prisma';

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
    manager_id?: number | null;
    support_manager_ids?: number[];
    description?: string;
    is_active?: boolean;
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
    manager_id?: number | null;
    support_manager_ids?: number[];
    description?: string;
    is_active?: boolean;
  }) {
    // Check if department exists
    const existing = await departmentsRepository.findById(id, tenantId);
    if (!existing) {
      throwNotFound('DEPARTMENT_NOT_FOUND');
    }

    // Check if code already exists (for other department)
    if (data.code && existing && data.code !== existing.code) {
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

    const managerId = data.manager_id === undefined ? existing.manager_id : data.manager_id;
    if (managerId) await this.validateManager(tenantId, managerId, id);
    const supportIds = data.support_manager_ids;
    if (supportIds !== undefined) {
      if (new Set(supportIds).size !== supportIds.length) throw new Error('Một người chỉ có thể được gán một lần làm Quản lý hỗ trợ.');
      if (managerId && supportIds.includes(managerId)) throw new Error('Trưởng phòng không thể đồng thời là Quản lý hỗ trợ.');
      await Promise.all(supportIds.map(userId => this.validateManager(tenantId, userId, id)));
    }
    const { support_manager_ids, ...departmentData } = data;
    return departmentsRepository.update(id, tenantId, departmentData, supportIds);
  },

  async validateManager(tenantId: number, userId: number, departmentId: number | null) {
    const user = await prisma.users.findFirst({
      where: { id: userId, tenant_id: tenantId, status: 'active', ...(departmentId ? { department_id: departmentId } : {}) },
      include: { position: { select: { can_manage_department: true, is_active: true } } },
    });
    if (!user) throw new Error('Người quản lý phải đang hoạt động và thuộc đúng phòng ban này.');
    if (!user.position?.is_active || !user.position.can_manage_department) throw new Error('Chỉ người có chức danh được phép quản lý phòng ban mới được gán.');
  },

  async deleteDepartment(id: number, tenantId: number) {
    return departmentsRepository.delete(id, tenantId);
  },
};
