import { prisma } from "../../config/prisma";
import { authorizationService } from "../authorization/authorization.service";
import { rolesService } from "../roles/roles.service";

export async function canAccessDocumentAudit(userId: number, tenantId: number, documentId: number): Promise<boolean> {
  if (await rolesService.checkPermission(userId, "audit_logs", "read")) return true;

  const [document, user] = await Promise.all([
    prisma.documents.findFirst({ where: { id: documentId, tenant_id: tenantId }, select: { owner_id: true, department_id: true, department: { select: { manager_id: true, support_managers: { select: { user_id: true } } } } } }),
    prisma.users.findFirst({
      where: { id: userId, tenant_id: tenantId },
      select: { department_id: true, status: true, position: { select: { is_active: true, can_manage_department: true } } },
    }),
  ]);
  if (!document || !user) return false;
  if (document.owner_id === userId) return true;
  const managesDocumentDepartment = document.department?.manager_id === userId || document.department?.support_managers.some((item) => item.user_id === userId);
  if (!managesDocumentDepartment || user.status !== "active" || user.department_id !== document.department_id || !user.position?.is_active || !user.position.can_manage_department) return false;

  return (await authorizationService.canAccessDocument(userId, tenantId, documentId, "read")).allowed;
}
