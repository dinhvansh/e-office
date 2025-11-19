import { numberingRepository } from './numbering.repository';

export const numberingService = {
  /**
   * Generate document number for a new document
   * Returns both the document number and the rule ID
   */
  async generateNumberForDocument(
    tenantId: number,
    documentTypeId: number
  ): Promise<{ documentNumber: string; ruleId: number }> {
    // Get numbering rule
    const rule = await numberingRepository.findByDocumentType(tenantId, documentTypeId);
    
    if (!rule) {
      throw new Error('Numbering rule not found for this document type');
    }

    if (!rule.is_active) {
      throw new Error('Numbering rule is not active');
    }

    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    // Increment number (with transaction)
    const { number } = await numberingRepository.incrementNumber(rule.id, currentYear);

    // Format number with leading zeros (3 digits)
    const formattedNumber = String(number).padStart(3, '0');

    // Build tokens map
    const tokens: Record<string, string> = {
      AUTO: formattedNumber,
      YEAR: String(currentYear),
      MONTH: currentMonth,
      DEPT: '', // Empty for now, will be filled in Phase 2
      TYPE: rule.document_type.code,
    };

    // Replace tokens in pattern
    let documentNumber = rule.pattern;
    Object.entries(tokens).forEach(([key, value]) => {
      documentNumber = documentNumber.replace(`{${key}}`, value);
    });

    return { documentNumber, ruleId: rule.id };
  },

  /**
   * Generate document number based on numbering rule
   * Pattern tokens:
   * - {AUTO} - Auto increment number (001, 002, ...)
   * - {YEAR} - Current year (2025)
   * - {MONTH} - Current month (01-12)
   * - {DEPT} - Department code
   * - {TYPE} - Document type code
   */
  async generateDocumentNumber(
    tenantId: number,
    documentTypeId: number,
    options?: {
      departmentCode?: string;
      customTokens?: Record<string, string>;
    }
  ): Promise<string> {
    // Get numbering rule
    const rule = await numberingRepository.findByDocumentType(tenantId, documentTypeId);
    
    if (!rule) {
      throw new Error('Numbering rule not found for this document type');
    }

    if (!rule.is_active) {
      throw new Error('Numbering rule is not active');
    }

    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    // Increment number (with transaction)
    const { number } = await numberingRepository.incrementNumber(rule.id, currentYear);

    // Format number with leading zeros (3 digits)
    const formattedNumber = String(number).padStart(3, '0');

    // Build tokens map
    const tokens: Record<string, string> = {
      AUTO: formattedNumber,
      YEAR: String(currentYear),
      MONTH: currentMonth,
      DEPT: options?.departmentCode || '',
      TYPE: rule.document_type.code,
      ...options?.customTokens,
    };

    // Replace tokens in pattern
    let documentNumber = rule.pattern;
    Object.entries(tokens).forEach(([key, value]) => {
      documentNumber = documentNumber.replace(`{${key}}`, value);
    });

    return documentNumber;
  },

  async getNumberingRule(tenantId: number, documentTypeId: number) {
    const rule = await numberingRepository.findByDocumentType(tenantId, documentTypeId);
    if (!rule) {
      throw new Error('Numbering rule not found');
    }
    return rule;
  },

  async getAllNumberingRules(tenantId: number) {
    return numberingRepository.findAll(tenantId);
  },

  async createNumberingRule(tenantId: number, data: {
    document_type_id: number;
    pattern: string;
    reset_yearly?: boolean;
  }) {
    // Check if rule already exists
    const existing = await numberingRepository.findByDocumentType(tenantId, data.document_type_id);
    if (existing) {
      throw new Error('Numbering rule already exists for this document type');
    }

    return numberingRepository.create({
      ...data,
      tenant_id: tenantId,
      last_number: 0,
    });
  },

  async updateNumberingRule(id: number, tenantId: number, data: {
    pattern?: string;
    reset_yearly?: boolean;
    is_active?: boolean;
  }) {
    const existing = await numberingRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Numbering rule not found');
    }

    return numberingRepository.update(id, data);
  },

  async previewDocumentNumber(
    pattern: string,
    lastNumber: number,
    options?: {
      departmentCode?: string;
      documentTypeCode?: string;
    }
  ): Promise<string> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const nextNumber = String(lastNumber + 1).padStart(3, '0');

    const tokens: Record<string, string> = {
      AUTO: nextNumber,
      YEAR: String(currentYear),
      MONTH: currentMonth,
      DEPT: options?.departmentCode || 'DEPT',
      TYPE: options?.documentTypeCode || 'TYPE',
    };

    let preview = pattern;
    Object.entries(tokens).forEach(([key, value]) => {
      preview = preview.replace(`{${key}}`, value);
    });

    return preview;
  },
};
