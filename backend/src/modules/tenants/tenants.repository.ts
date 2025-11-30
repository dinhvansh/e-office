import { tenants } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class TenantsRepository {
  findById(id: number): Promise<tenants | null> {
    return prisma.tenants.findFirst({ where: { id } });
  }

  async getStats(tenantId: number) {
    const [totalUsers, activeUsers, totalDocuments, totalStorage] = await Promise.all([
      prisma.users.count({ where: { tenant_id: tenantId } }),
      prisma.users.count({ where: { tenant_id: tenantId, status: 'active' } }),
      prisma.documents.count({ where: { tenant_id: tenantId } }),
      // Storage calculation would need file system check, return 0 for now
      Promise.resolve(0),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      documents: {
        total: totalDocuments,
      },
      storage: {
        used: totalStorage,
        unit: 'GB',
      },
    };
  }
}

export const tenantsRepository = new TenantsRepository();
