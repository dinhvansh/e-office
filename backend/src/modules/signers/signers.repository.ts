import { Prisma } from "@prisma/client";
import { DbClient, prisma } from "../../config/prisma";

export class SignersRepository {
  createMany(data: Prisma.signersCreateManyInput[], db: DbClient = prisma) {
    return db.signers.createMany({ data });
  }

  create(data: Prisma.signersCreateInput, db: DbClient = prisma) {
    return db.signers.create({ data });
  }

  findById(id: number, db: DbClient = prisma) {
    return db.signers.findFirst({
      where: { id },
      include: { sign_request: { include: { document: true } } },
    });
  }

  update(id: number, data: Prisma.signersUpdateInput, db: DbClient = prisma) {
    return db.signers.update({
      where: { id },
      data,
    });
  }

  countCompleted(signRequestId: number, db: DbClient = prisma) {
    return db.signers.count({
      where: { sign_request_id: signRequestId, status: "completed" },
    });
  }

  countTotal(signRequestId: number, db: DbClient = prisma) {
    return db.signers.count({
      where: { sign_request_id: signRequestId },
    });
  }

  findBySignRequest(signRequestId: number, db: DbClient = prisma) {
    return db.signers.findMany({
      where: { sign_request_id: signRequestId },
    });
  }

  // ✅ Phase 2: Delete signer
  delete(id: number, db: DbClient = prisma) {
    return db.signers.delete({
      where: { id },
    });
  }
}

export const signersRepository = new SignersRepository();
