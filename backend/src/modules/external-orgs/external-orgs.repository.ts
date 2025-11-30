import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ExternalOrgsRepository {
  async findAll(tenantId: number) {
    return prisma.external_organizations.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" },
    });
  }

  async findAllPaginated(
    tenantId: number,
    options: {
      page: number;
      limit: number;
      category?: string;
    }
  ) {
    const { page, limit, category } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId };
    if (category) {
      where.category = category;
    }

    const [orgs, total] = await Promise.all([
      prisma.external_organizations.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.external_organizations.count({ where }),
    ]);

    return {
      orgs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: number, tenantId: number) {
    return prisma.external_organizations.findFirst({
      where: { id, tenant_id: tenantId },
    });
  }

  async findByCode(code: string, tenantId: number) {
    return prisma.external_organizations.findFirst({
      where: { code, tenant_id: tenantId },
    });
  }

  async create(data: {
    tenant_id: number;
    name: string;
    code?: string;
    category?: string;
    address?: string;
    phone?: string;
    email?: string;
    contact_person?: string;
  }) {
    return prisma.external_organizations.create({ data });
  }

  async update(
    id: number,
    tenantId: number,
    data: {
      name?: string;
      code?: string;
      category?: string;
      address?: string;
      phone?: string;
      email?: string;
      contact_person?: string;
      is_active?: boolean;
    }
  ) {
    return prisma.external_organizations.update({
      where: { id },
      data: { ...data, tenant_id: tenantId },
    });
  }

  async delete(id: number, tenantId: number) {
    return prisma.external_organizations.delete({
      where: { id, tenant_id: tenantId },
    });
  }

  async countByCategory(tenantId: number) {
    const orgs = await prisma.external_organizations.groupBy({
      by: ["category"],
      where: { tenant_id: tenantId, is_active: true },
      _count: true,
    });
    return orgs;
  }
}

export const externalOrgsRepository = new ExternalOrgsRepository();
