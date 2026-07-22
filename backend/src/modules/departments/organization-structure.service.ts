import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

export type OrganizationMemberInput = {
  user_id: number;
  position_id: number | null;
  manager_id: number | null;
};

export type ManagerReplacementInput = {
  department_id: number;
  outgoing_user_id: number;
  replacement_user_id: number;
};

export type OrganizationStructureInput = {
  manager_id: number | null;
  support_manager_ids: number[];
  members: OrganizationMemberInput[];
  manager_replacements: ManagerReplacementInput[];
};

const badRequest = (code: string, message: string, details?: unknown): never => {
  throw new AppError(code, message, 400, details);
};

const detailInclude = {
  parent: { select: { id: true, name: true } },
  manager: { select: { id: true, email: true, full_name: true, avatar_url: true } },
  support_managers: { include: { user: { select: { id: true, email: true, full_name: true, avatar_url: true } } } },
  users: {
    where: { status: 'active' },
    select: {
      id: true, email: true, full_name: true, avatar_url: true, department_id: true,
      manager_id: true, position_id: true,
      position: { select: { id: true, code: true, name: true } },
      manager: { select: { id: true, email: true, full_name: true } },
    },
    orderBy: [{ full_name: 'asc' as const }, { email: 'asc' as const }],
  },
  _count: { select: { users: true, children: true } },
};

export const organizationStructureService = {
  async get(tenantId: number, departmentId: number) {
    const [department, availableUsers, positions] = await Promise.all([
      prisma.departments.findFirst({ where: { id: departmentId, tenant_id: tenantId }, include: detailInclude }),
      prisma.users.findMany({
        where: { tenant_id: tenantId, status: 'active' },
        select: {
          id: true, email: true, full_name: true, avatar_url: true, department_id: true,
          manager_id: true, position_id: true,
          department: { select: { id: true, name: true } },
          position: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ full_name: 'asc' }, { email: 'asc' }],
      }),
      prisma.positions.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, code: true, name: true, level: true, _count: { select: { users: true } } },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      }),
    ]);
    if (!department) throw new AppError('DEPARTMENT_NOT_FOUND', 'Không tìm thấy phòng ban', 404);
    return { department, available_users: availableUsers, positions };
  },

  async update(tenantId: number, departmentId: number, input: OrganizationStructureInput) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM departments WHERE id = ${departmentId} AND tenant_id = ${tenantId} FOR UPDATE`;
      const department = await tx.departments.findFirst({ where: { id: departmentId, tenant_id: tenantId } });
      if (!department) throw new AppError('DEPARTMENT_NOT_FOUND', 'Không tìm thấy phòng ban', 404);

      const memberIds = input.members.map((member) => member.user_id);
      const uniqueMemberIds = [...new Set(memberIds)];
      if (uniqueMemberIds.length !== memberIds.length) badRequest('ORGANIZATION_DUPLICATE_MEMBER', 'Danh sách nhân sự bị trùng.');
      const supportIds = [...new Set(input.support_manager_ids)];
      if (supportIds.length !== input.support_manager_ids.length) badRequest('ORGANIZATION_DUPLICATE_SUPPORT_MANAGER', 'Danh sách quản lý hỗ trợ bị trùng.');
      if (input.manager_id && supportIds.includes(input.manager_id)) badRequest('ORGANIZATION_MANAGER_CONFLICT', 'Trưởng phòng không thể đồng thời là quản lý hỗ trợ.');

      const referencedUserIds = [...new Set([
        ...uniqueMemberIds,
        ...supportIds,
        ...(input.manager_id ? [input.manager_id] : []),
        ...input.members.flatMap((member) => member.manager_id ? [member.manager_id] : []),
        ...input.manager_replacements.flatMap((item) => [item.outgoing_user_id, item.replacement_user_id]),
      ])];
      const validUsers = referencedUserIds.length ? await tx.users.findMany({
        where: { id: { in: referencedUserIds }, tenant_id: tenantId, status: 'active' },
        select: { id: true, department_id: true },
      }) : [];
      if (validUsers.length !== referencedUserIds.length) badRequest('ORGANIZATION_INVALID_USER', 'Có người dùng không tồn tại, không hoạt động hoặc không thuộc doanh nghiệp này.');
      const usersById = new Map(validUsers.map((user) => [user.id, user]));

      if (input.manager_id && !uniqueMemberIds.includes(input.manager_id)) badRequest('ORGANIZATION_MANAGER_NOT_MEMBER', 'Trưởng phòng phải thuộc danh sách thành viên của phòng ban.');
      if (supportIds.some((id) => !uniqueMemberIds.includes(id))) badRequest('ORGANIZATION_SUPPORT_MANAGER_NOT_MEMBER', 'Quản lý hỗ trợ phải thuộc danh sách thành viên của phòng ban.');
      for (const member of input.members) {
        if (member.manager_id === member.user_id) badRequest('ORGANIZATION_SELF_MANAGER', 'Nhân sự không thể tự làm quản lý trực tiếp của chính mình.');
        if (member.manager_id && !uniqueMemberIds.includes(member.manager_id)) badRequest('ORGANIZATION_DIRECT_MANAGER_NOT_MEMBER', 'Quản lý trực tiếp phải thuộc cùng phòng ban.');
      }

      const positionIds = [...new Set(input.members.flatMap((member) => member.position_id ? [member.position_id] : []))];
      if (positionIds.length) {
        const positionCount = await tx.positions.count({ where: { id: { in: positionIds }, tenant_id: tenantId, is_active: true } });
        if (positionCount !== positionIds.length) badRequest('ORGANIZATION_INVALID_POSITION', 'Có chức danh không hợp lệ hoặc đã ngừng hoạt động.');
      }

      const currentMembers = await tx.users.findMany({ where: { tenant_id: tenantId, department_id: departmentId }, select: { id: true } });
      const removedIds = currentMembers.map((user) => user.id).filter((id) => !uniqueMemberIds.includes(id));
      const movedIds = uniqueMemberIds.filter((id) => usersById.get(id)?.department_id && usersById.get(id)?.department_id !== departmentId);
      const departingIds = [...new Set([...removedIds, ...movedIds])];

      const managedElsewhere = departingIds.length ? await tx.departments.findMany({
        where: { tenant_id: tenantId, manager_id: { in: departingIds }, id: { not: departmentId } },
        select: { id: true, name: true, manager_id: true },
      }) : [];
      const replacementMap = new Map(input.manager_replacements.map((item) => [`${item.department_id}:${item.outgoing_user_id}`, item.replacement_user_id]));
      for (const managedDepartment of managedElsewhere) {
        const outgoingId = managedDepartment.manager_id!;
        const replacementId = replacementMap.get(`${managedDepartment.id}:${outgoingId}`);
        if (!replacementId) badRequest('MANAGER_REPLACEMENT_REQUIRED', `Phải chọn trưởng phòng thay thế cho ${managedDepartment.name} trước khi chuyển nhân sự.`, { department_id: managedDepartment.id, outgoing_user_id: outgoingId });
        const replacement = usersById.get(replacementId);
        if (!replacement || replacement.department_id !== managedDepartment.id || replacementId === outgoingId) badRequest('MANAGER_REPLACEMENT_INVALID', `Trưởng phòng thay thế của ${managedDepartment.name} phải đang thuộc phòng ban đó.`);
        await tx.departments.update({ where: { id: managedDepartment.id }, data: { manager_id: replacementId } });
      }

      if (department.manager_id && removedIds.includes(department.manager_id) && !input.manager_id) {
        badRequest('MANAGER_REPLACEMENT_REQUIRED', 'Phải chọn trưởng phòng thay thế trước khi chuyển trưởng phòng hiện tại khỏi phòng ban.');
      }

      if (departingIds.length) {
        await tx.department_support_managers.deleteMany({ where: { user_id: { in: departingIds } } });
      }
      if (removedIds.length) {
        await tx.users.updateMany({ where: { id: { in: removedIds }, tenant_id: tenantId, department_id: departmentId }, data: { department_id: null, manager_id: null } });
      }
      // A transferred leader must not remain the direct manager of people left
      // behind in the previous department. Member assignments below re-apply
      // any valid same-department reporting lines from the submitted snapshot.
      if (departingIds.length) {
        await tx.users.updateMany({ where: { tenant_id: tenantId, manager_id: { in: departingIds } }, data: { manager_id: null } });
      }
      for (const member of input.members) {
        await tx.users.update({ where: { id: member.user_id }, data: { department_id: departmentId, position_id: member.position_id, manager_id: member.manager_id } });
      }

      await tx.departments.update({ where: { id: departmentId }, data: { manager_id: input.manager_id } });
      await tx.department_support_managers.deleteMany({ where: { department_id: departmentId } });
      if (supportIds.length) await tx.department_support_managers.createMany({ data: supportIds.map((user_id) => ({ department_id: departmentId, user_id })) });

      return tx.departments.findFirstOrThrow({ where: { id: departmentId, tenant_id: tenantId }, include: detailInclude });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
