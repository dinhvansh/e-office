import { prisma } from "../../config/prisma";

/**
 * Authoritative policy for department-scoped leadership access.
 * A job position alone never grants access: the active user must be explicitly
 * assigned as the department manager or support manager for that department.
 */
export async function hasDepartmentLeadershipAccess(userId: number, tenantId: number, departmentId: number | null | undefined): Promise<boolean> {
  if (!departmentId) return false;

  const user = await prisma.users.findFirst({
    where: { id: userId, tenant_id: tenantId, department_id: departmentId, status: "active" },
    select: { id: true },
  });
  if (!user) return false;

  const department = await prisma.departments.findFirst({
    where: { id: departmentId, tenant_id: tenantId, is_active: true },
    select: { manager_id: true, support_managers: { where: { user_id: userId }, select: { id: true } } },
  });
  return department?.manager_id === userId || !!department?.support_managers.length;
}
