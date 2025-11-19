import { documentTypesRepository } from './documentTypes.repository';

export const documentTypesService = {
  async getDocumentTypes(tenantId: number, filters?: any) {
    return documentTypesRepository.findByTenant(tenantId, filters);
  },

  async getDocumentTypeById(id: number, tenantId: number) {
    const documentType = await documentTypesRepository.findById(id, tenantId);
    if (!documentType) {
      throw new Error('Document type not found');
    }
    return documentType;
  },

  async createDocumentType(tenantId: number, data: {
    code: string;
    name: string;
    description?: string;
    category?: string;
    require_numbering?: boolean;
    require_digital_signing?: boolean;
    numbering_pattern?: string | null;
  }) {
    // Check if code already exists
    const existing = await documentTypesRepository.findByCode(data.code, tenantId);
    if (existing) {
      throw new Error('Document type code already exists');
    }

    const documentType = await documentTypesRepository.create({
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      require_numbering: data.require_numbering,
      require_digital_signing: data.require_digital_signing,
      tenant_id: tenantId,
    });

    // Create numbering rule if required
    if (data.require_numbering && data.numbering_pattern) {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.numbering_rules.create({
        data: {
          tenant_id: tenantId,
          document_type_id: documentType.id,
          pattern: data.numbering_pattern,
          reset_yearly: true,
          last_number: 0,
        },
      });
      await prisma.$disconnect();
    }

    return documentType;
  },

  async updateDocumentType(id: number, tenantId: number, data: {
    name?: string;
    description?: string;
    category?: string;
    require_numbering?: boolean;
    require_digital_signing?: boolean;
    is_active?: boolean;
    numbering_pattern?: string | null;
  }) {
    const existing = await documentTypesRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Document type not found');
    }

    const updated = await documentTypesRepository.update(id, {
      name: data.name,
      description: data.description,
      category: data.category,
      require_numbering: data.require_numbering,
      require_digital_signing: data.require_digital_signing,
      is_active: data.is_active,
    });

    // Update or create numbering rule
    if (data.require_numbering && data.numbering_pattern) {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.numbering_rules.upsert({
        where: {
          tenant_id_document_type_id: {
            tenant_id: tenantId,
            document_type_id: id,
          },
        },
        update: {
          pattern: data.numbering_pattern,
        },
        create: {
          tenant_id: tenantId,
          document_type_id: id,
          pattern: data.numbering_pattern,
          reset_yearly: true,
          last_number: 0,
        },
      });
      await prisma.$disconnect();
    }

    return updated;
  },

  async deleteDocumentType(id: number, tenantId: number) {
    const existing = await documentTypesRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Document type not found');
    }

    // Check if document type is in use
    if (existing._count.documents > 0) {
      throw new Error('Cannot delete document type that is in use');
    }

    return documentTypesRepository.delete(id);
  },

  async getStats(tenantId: number) {
    return documentTypesRepository.getStats(tenantId);
  },
};
