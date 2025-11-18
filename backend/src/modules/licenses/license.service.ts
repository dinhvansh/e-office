import { license, tenants } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";

class LicenseService {
  async ensureLicenseForTenant(tenantId: number): Promise<license | null> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw ApiError.notFound("Tenant not found", "TENANT_NOT_FOUND");
    }
    if (!this.isOnPremPlan(tenant.plan)) {
      return null;
    }
    const licenseRecord = await this.findLicenseRecord(tenant);
    if (!licenseRecord) {
      throw ApiError.forbidden("Valid license required for on-prem tenant", "LICENSE_REQUIRED");
    }
    if (licenseRecord.expire_date && licenseRecord.expire_date < new Date()) {
      throw ApiError.forbidden("License expired", "LICENSE_EXPIRED");
    }
    return licenseRecord;
  }

  async enforceDocumentLimit(tenantId: number): Promise<void> {
    const licenseRecord = await this.ensureLicenseForTenant(tenantId);
    if (!licenseRecord || !licenseRecord.limit_docs) {
      return;
    }
    const docCount = await prisma.documents.count({ where: { tenant_id: tenantId } });
    if (docCount >= licenseRecord.limit_docs) {
      throw ApiError.forbidden("Document limit reached for license", "LICENSE_DOC_LIMIT");
    }
  }

  async enforceUserLimit(tenantId: number): Promise<void> {
    const licenseRecord = await this.ensureLicenseForTenant(tenantId);
    if (!licenseRecord || !licenseRecord.limit_user) {
      return;
    }
    const userCount = await prisma.users.count({ where: { tenant_id: tenantId } });
    if (userCount >= licenseRecord.limit_user) {
      throw ApiError.forbidden("User limit reached for license", "LICENSE_USER_LIMIT");
    }
  }

  private isOnPremPlan(plan: string | null | undefined): boolean {
    if (!plan) {
      return false;
    }
    return plan.toLowerCase().includes("on-prem");
  }

  private getTenant(tenantId: number): Promise<tenants | null> {
    return prisma.tenants.findFirst({ where: { id: tenantId } });
  }

  private findLicenseRecord(tenant: tenants): Promise<license | null> {
    const keys = [tenant.name, tenant.domain, tenant.id.toString()].filter(Boolean) as string[];
    return prisma.license.findFirst({
      where: {
        tenant: { in: keys },
      },
      orderBy: { id: "desc" },
    });
  }
}

export const licenseService = new LicenseService();
