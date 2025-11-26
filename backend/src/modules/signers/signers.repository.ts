import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class SignersRepository {
  createMany(data: Prisma.signersCreateManyInput[]) {
    return prisma.signers.createMany({ data });
  }

  create(data: Prisma.signersCreateInput) {
    return prisma.signers.create({ data });
  }

  findById(id: number) {
    return prisma.signers.findFirst({
      where: { id },
      include: { sign_request: true },
    });
  }

  update(id: number, data: Prisma.signersUpdateInput) {
    return prisma.signers.update({
      where: { id },
      data,
    });
  }

  countCompleted(signRequestId: number) {
    return prisma.signers.count({
      where: { sign_request_id: signRequestId, status: "completed" },
    });
  }

  countTotal(signRequestId: number) {
    return prisma.signers.count({
      where: { sign_request_id: signRequestId },
    });
  }

  findBySignRequest(signRequestId: number) {
    return prisma.signers.findMany({
      where: { sign_request_id: signRequestId },
    });
  }

  // ✅ Phase 2: Delete signer
  delete(id: number) {
    return prisma.signers.delete({
      where: { id },
    });
  }
}

export const signersRepository = new SignersRepository();
