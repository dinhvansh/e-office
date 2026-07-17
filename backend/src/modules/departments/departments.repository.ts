import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { throwError, throwNotFound } from '../../utils/errors';


export const departmentsRepository = {
  async findByTenant(tenantId: number) {
    return prisma.departments.findMany({
      where: { tenant_id: tenantId },
      include: {
        parent: true,
        manager: {
          select: { id: true, email: true, full_name: true },
        },
        support_managers: { include: { user: { select: { id: true, email: true, full_name: true, avatar_url: true, position: { select: { name: true } } } } } },
        _count: {
          select: { users: true, children: true },
        },
      },
      orderBy: { id: 'desc' }, // Newest first
    });
  },

  async findById(id: number, tenantId: number) {
    return prisma.departments.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        parent: true,
        manager: {
          select: { id: true, email: true, full_name: true },
        },
        support_managers: { include: { user: { select: { id: true, email: true, full_name: true, avatar_url: true, position: { select: { name: true } } } } } },
        users: {
          select: { id: true, email: true, full_name: true, role: true },
        },
        children: true,
      },
    });
  },

  async findByCode(tenantId: number, code: string) {
    return prisma.departments.findFirst({
      where: { 
        tenant_id: tenantId,
        code: code,
      },
    });
  },

  async create(data: Prisma.departmentsUncheckedCreateInput) {
    return prisma.departments.create({
      data,
      include: {
        manager: {
          select: { id: true, email: true, full_name: true },
        },
      },
    });
  },

  async update(id: number, tenantId: number, data: Prisma.departmentsUpdateInput, supportManagerIds?: number[]) {
    const updated = await prisma.departments.updateMany({
      where: { id, tenant_id: tenantId },
      data,
    });
    if (updated.count !== 1) throwNotFound('DEPARTMENT_NOT_FOUND');
    if (supportManagerIds !== undefined) {
      await prisma.department_support_managers.deleteMany({ where: { department_id: id } });
      if (supportManagerIds.length) await prisma.department_support_managers.createMany({ data: supportManagerIds.map(user_id => ({ department_id: id, user_id })) });
    }
    return prisma.departments.findFirstOrThrow({
      where: { id, tenant_id: tenantId },
      include: { manager: { select: { id: true, email: true, full_name: true } }, support_managers: { include: { user: { select: { id: true, email: true, full_name: true, avatar_url: true, position: { select: { name: true } } } } } } },
    });
  },

  async delete(id: number, tenantId: number) {
    // Check if department has users or children
    const dept = await prisma.departments.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        _count: {
          select: { users: true, children: true },
        },
      },
    });

    if (!dept) {
      throwNotFound('DEPARTMENT_NOT_FOUND');
    }

    if (dept && dept._count.users > 0) {
      throwError('DEPARTMENT_HAS_USERS');
    }

    if (dept && dept._count.children > 0) {
      throwError('DEPARTMENT_HAS_CHILDREN');
    }

    const deleted = await prisma.departments.deleteMany({ where: { id, tenant_id: tenantId } });
    if (deleted.count !== 1) throwNotFound('DEPARTMENT_NOT_FOUND');
  },

  async getTree(tenantId: number) {
    const departments = await prisma.departments.findMany({
      where: { tenant_id: tenantId },
      include: {
        manager: {
          select: { id: true, email: true, full_name: true },
        },
        support_managers: { include: { user: { select: { id: true, email: true, full_name: true, avatar_url: true, position: { select: { name: true } } } } } },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build tree structure
    type DepartmentTreeNode = (typeof departments)[number] & { children: DepartmentTreeNode[] };
    const deptMap = new Map<number, DepartmentTreeNode>();
    const roots: DepartmentTreeNode[] = [];

    departments.forEach(dept => {
      deptMap.set(dept.id, { ...dept, children: [] });
    });

    departments.forEach(dept => {
      const node = deptMap.get(dept.id);
      if (dept.parent_id) {
        const parent = deptMap.get(dept.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  },
};
