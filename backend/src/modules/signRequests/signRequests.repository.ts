import { Prisma } from "@prisma/client";
import { DbClient, prisma } from "../../config/prisma";

export class SignRequestsRepository {
  listByTenant(tenantId: number, db: DbClient = prisma) {
    return db.sign_requests.findMany({
      where: { tenant_id: tenantId },
      include: { signers: true, document: true },
      orderBy: { created_at: "desc" },
    });
  }

  findMany(params: {
    where: Prisma.sign_requestsWhereInput;
    include?: Prisma.sign_requestsInclude;
    orderBy?: Prisma.sign_requestsOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }, db: DbClient = prisma) {
    return db.sign_requests.findMany(params);
  }

  create(data: Prisma.sign_requestsCreateInput, db: DbClient = prisma) {
    return db.sign_requests.create({ data });
  }

  findById(id: number, tenantId: number, db: DbClient = prisma) {
    return db.sign_requests.findFirst({
      where: { id, tenant_id: tenantId },
      include: { 
        signers: {
          orderBy: { signing_order: 'asc' }
        }, 
        document: true,
        fields: {
          orderBy: { id: 'asc' }
        }
      },
    });
  }

  updateStatus(id: number, tenantId: number, status: string, db: DbClient = prisma) {
    return db.sign_requests.updateMany({
      where: { id, tenant_id: tenantId },
      data: { status },
    });
  }

  async countFields(signRequestId: number, db: DbClient = prisma): Promise<number> {
    return db.sign_request_fields.count({
      where: { sign_request_id: signRequestId },
    });
  }
}

export const signRequestsRepository = new SignRequestsRepository();
