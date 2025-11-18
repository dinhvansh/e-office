import { tenants } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class TenantsRepository {
  findById(id: number): Promise<tenants | null> {
    return prisma.tenants.findFirst({ where: { id } });
  }
}

export const tenantsRepository = new TenantsRepository();
