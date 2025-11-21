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
    require_approval?: boolean;
    default_workflow_id?: number | null;
    allow_workflow_override?: boolean;
    numbering_pattern?: string | null;
  }) {
    // Check if code already exists
    const existing = await documentTypesRepository.findByCode(data.code, tenantId);
    if (existing) {
      throw new Error('Document type code already exists');
    }

    // Validate: if require_approval = true and allow_workflow_override = true
    // then default_workflow_id must be set
    if (data.require_approval && data.allow_workflow_override && !data.default_workflow_id) {
      throw new Error('Phải chọn quy trình mặc định khi cho phép tùy chỉnh');
    }

    const documentType = await documentTypesRepository.create({
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      require_numbering: data.require_numbering,
      require_digital_signing: data.require_digital_signing,
      require_approval: data.require_approval,
      default_workflow_id: data.default_workflow_id,
      allow_workflow_override: data.allow_workflow_override,
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
    require_approval?: boolean;
    default_workflow_id?: number | null;
    allow_workflow_override?: boolean;
    is_active?: boolean;
    numbering_pattern?: string | null;
  }) {
    const existing = await documentTypesRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Document type not found');
    }

    // Validate: if require_approval = true and allow_workflow_override = true
    // then default_workflow_id must be set
    if (data.require_approval && data.allow_workflow_override && !data.default_workflow_id) {
      throw new Error('Phải chọn quy trình mặc định khi cho phép tùy chỉnh');
    }

    const updated = await documentTypesRepository.update(id, {
      name: data.name,
      description: data.description,
      category: data.category,
      require_numbering: data.require_numbering,
      require_digital_signing: data.require_digital_signing,
      require_approval: data.require_approval,
      default_workflow_id: data.default_workflow_id,
      allow_workflow_override: data.allow_workflow_override,
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
