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
  }) {
    // Check if code already exists
    const existing = await documentTypesRepository.findByCode(data.code, tenantId);
    if (existing) {
      throw new Error('Document type code already exists');
    }

    return documentTypesRepository.create({
      ...data,
      tenant_id: tenantId,
    });
  },

  async updateDocumentType(id: number, tenantId: number, data: {
    name?: string;
    description?: string;
    category?: string;
    require_numbering?: boolean;
    require_digital_signing?: boolean;
    is_active?: boolean;
  }) {
    const existing = await documentTypesRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Document type not found');
    }

    return documentTypesRepository.update(id, data);
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
