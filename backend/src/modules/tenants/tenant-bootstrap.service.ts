import { prisma } from "../../config/prisma";

/** Shared self-hosted/internal provisioning primitive; never a public signup flow. */
export class TenantBootstrapService {
  async bootstrapTenant(tenantId: number, ownerUserId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const [adminRole] = await Promise.all([
        tx.roles.upsert({ where: { tenant_id_name: { tenant_id: tenantId, name: "Admin" } }, create: { tenant_id: tenantId, name: "Admin", description: "Tenant administrator", is_system: true }, update: {} }),
        tx.roles.upsert({ where: { tenant_id_name: { tenant_id: tenantId, name: "User" } }, create: { tenant_id: tenantId, name: "User", description: "Tenant user", is_system: true }, update: {} }),
      ]);
      const permissions = await tx.permissions.findMany({ where: { NOT: { resource: "archive", action: "delete_permanently" } }, select: { id: true } });
      await tx.role_permissions.createMany({ data: permissions.map(({ id }) => ({ role_id: adminRole.id, permission_id: id })), skipDuplicates: true });
      await tx.user_roles.upsert({ where: { user_id_role_id: { user_id: ownerUserId, role_id: adminRole.id } }, create: { user_id: ownerUserId, role_id: adminRole.id }, update: {} });
      await tx.users.update({ where: { id: ownerUserId }, data: { role: "admin", status: "active" } });
    });
  }
}
export const tenantBootstrapService = new TenantBootstrapService();
