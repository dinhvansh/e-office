import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const numberingRepository = {
  async findByDocumentType(tenantId: number, documentTypeId: number) {
    return prisma.numbering_rules.findUnique({
      where: {
        tenant_id_document_type_id: {
          tenant_id: tenantId,
          document_type_id: documentTypeId,
        },
      },
      include: {
        document_type: true,
      },
    });
  },

  async findById(id: number, tenantId: number) {
    return prisma.numbering_rules.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        document_type: true,
      },
    });
  },

  async create(data: any) {
    return prisma.numbering_rules.create({
      data,
      include: {
        document_type: true,
      },
    });
  },

  async update(id: number, data: any) {
    return prisma.numbering_rules.update({
      where: { id },
      data,
      include: {
        document_type: true,
      },
    });
  },

  async incrementNumber(id: number, currentYear: number) {
    return prisma.$transaction(async (tx) => {
      const rule = await tx.numbering_rules.findUnique({
        where: { id },
      });

      if (!rule) {
        throw new Error('Numbering rule not found');
      }

      // Check if need to reset (yearly reset)
      let newNumber = rule.last_number + 1;
      let newResetYear = rule.last_reset_year;

      if (rule.reset_yearly && rule.last_reset_year !== currentYear) {
        newNumber = 1;
        newResetYear = currentYear;
      }

      // Update rule
      const updated = await tx.numbering_rules.update({
        where: { id },
        data: {
          last_number: newNumber,
          last_reset_year: newResetYear,
        },
      });

      return { number: newNumber, rule: updated };
    });
  },

  async findAll(tenantId: number) {
    return prisma.numbering_rules.findMany({
      where: { tenant_id: tenantId },
      include: {
        document_type: true,
      },
      orderBy: { created_at: 'desc' },
    });
  },
};
