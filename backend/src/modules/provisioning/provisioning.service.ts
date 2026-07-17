import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { tenantBootstrapService } from "../tenants/tenant-bootstrap.service";

export class ProvisioningService {
  async provision(input: { workspace_name: string; owner_email: string; owner_full_name: string; password_hash: string }) {
    const email = input.owner_email.trim().toLowerCase();
    const created = await prisma.$transaction(async (tx) => {
      if (await tx.users.findUnique({ where: { email } })) throw ApiError.conflict("Owner email already exists", "OWNER_EMAIL_EXISTS");
      const tenant = await tx.tenants.create({ data: { name: input.workspace_name.trim(), status: "active" } });
      const owner = await tx.users.create({ data: { tenant_id: tenant.id, email, full_name: input.owner_full_name.trim(), password_hash: input.password_hash, role: "admin", status: "active" } });
      return { tenant, owner };
    });
    await tenantBootstrapService.bootstrapTenant(created.tenant.id, created.owner.id);
    return { tenant_id: created.tenant.id, owner_user_id: created.owner.id };
  }
}
export const provisioningService = new ProvisioningService();
