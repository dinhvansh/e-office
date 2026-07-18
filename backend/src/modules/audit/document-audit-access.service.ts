import { prisma } from "../../config/prisma";
import { authorizationService } from "../authorization/authorization.service";
import { hasDepartmentLeadershipAccess } from "../departments/department-leadership-access.service";
import { rolesService } from "../roles/roles.service";

export async function canAccessDocumentAudit(userId: number, tenantId: number, documentId: number): Promise<boolean> {
  if (await rolesService.checkPermission(userId, "audit_logs", "read")) return true;

  const [document, user] = await Promise.all([
    prisma.documents.findFirst({ where: { id: documentId, tenant_id: tenantId }, select: { owner_id: true, department_id: true } }),
    prisma.users.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true } }),
  ]);
  if (!document || !user) return false;
  if (document.owner_id === userId) return true;
  if (!await hasDepartmentLeadershipAccess(userId, tenantId, document.department_id)) return false;

  return (await authorizationService.canAccessDocument(userId, tenantId, documentId, "read")).allowed;
}
