import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class SignRequestsRepository {
  listByTenant(tenantId: number) {
    return prisma.sign_requests.findMany({
      where: { tenant_id: tenantId },
      include: { signers: true, document: true },
      orderBy: { created_at: "desc" },
    });
  }

  create(data: Prisma.sign_requestsCreateInput) {
    return prisma.sign_requests.create({ data });
  }

  findById(id: number, tenantId: number) {
    return prisma.sign_requests.findFirst({
      where: { id, tenant_id: tenantId },
      include: { signers: true, document: true },
    });
  }

  updateStatus(id: number, tenantId: number, status: string) {
    return prisma.sign_requests.updateMany({
      where: { id, tenant_id: tenantId },
      data: { status },
    });
  }

  async countFields(signRequestId: number): Promise<number> {
    return prisma.sign_request_fields.count({
      where: { sign_request_id: signRequestId },
    });
  }
}

export const signRequestsRepository = new SignRequestsRepository();
