import { ApiError } from "../../core/errors/api-error";
import { tenantsRepository } from "./tenants.repository";

class TenantsService {
  async getTenantProfile(tenantId: number) {
    const tenant = await tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw ApiError.notFound("Tenant not found", "TENANT_NOT_FOUND");
    }
    return tenant;
  }
}

export const tenantsService = new TenantsService();
