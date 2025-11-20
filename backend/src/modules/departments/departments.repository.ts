import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const departmentsRepository = {
  async findByTenant(tenantId: number) {
    return prisma.departments.findMany({
      where: { tenant_id: tenantId },
      include: {
        parent: true,
        manager: {
          select: { id: true, email: true, full_name: true },
        },
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

  async create(data: any) {
    return prisma.departments.create({
      data,
      include: {
        manager: {
          select: { id: true, email: true, full_name: true },
        },
      },
    });
  },

  async update(id: number, tenantId: number, data: any) {
    return prisma.departments.update({
      where: { id },
      data,
      include: {
        manager: {
          select: { id: true, email: true, full_name: true },
        },
      },
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
      const { throwNotFound } = require('../../utils/errors');
      throwNotFound('DEPARTMENT_NOT_FOUND');
    }

    if (dept._count.users > 0) {
      const { throwError } = require('../../utils/errors');
      throwError('DEPARTMENT_HAS_USERS');
    }

    if (dept._count.children > 0) {
      const { throwError } = require('../../utils/errors');
      throwError('DEPARTMENT_HAS_CHILDREN');
    }

    return prisma.departments.delete({
      where: { id },
    });
  },

  async getTree(tenantId: number) {
    const departments = await prisma.departments.findMany({
      where: { tenant_id: tenantId },
      include: {
        manager: {
          select: { id: true, email: true, full_name: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build tree structure
    const deptMap = new Map();
    const roots: any[] = [];

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
