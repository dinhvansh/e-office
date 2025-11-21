import { signRequestFieldsRepository, CreateFieldData } from './signRequestFields.repository';
import { signRequestsRepository } from './signRequests.repository';
import { ApiError } from '../../core/errors/api-error';

export interface FieldInput {
  id?: number;
  assigned_signer_id?: number | null;
  type: string;
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  required?: boolean;
  label?: string;
  placeholder?: string;
  read_only?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export class SignRequestFieldsService {
  /**
   * Get editor data (sign request + document + signers + fields)
   */
  async getEditorData(signRequestId: number, tenantId: number, userId: number) {
    // Get sign request with document and signers
    const signRequest = await signRequestsRepository.findById(signRequestId);

    if (!signRequest) {
      throw ApiError.notFound('Sign request not found');
    }

    // Check tenant isolation
    if (signRequest.tenant_id !== tenantId) {
      throw ApiError.forbidden('Access denied');
    }

    // Check permissions (owner or admin)
    // TODO: Add proper permission check with user roles
    // For now, just check if user exists in tenant

    // Get fields
    const fields = await signRequestFieldsRepository.findBySignRequest(signRequestId);

    return {
      signRequest,
      fields,
    };
  }

  /**
   * Save fields (bulk upsert)
   */
  async saveFields(
    signRequestId: number,
    fields: FieldInput[],
    tenantId: number,
    userId: number
  ): Promise<void> {
    // Get sign request
    const signRequest = await signRequestsRepository.findById(signRequestId);

    if (!signRequest) {
      throw ApiError.notFound('Sign request not found');
    }

    // Check tenant isolation
    if (signRequest.tenant_id !== tenantId) {
      throw ApiError.forbidden('Access denied');
    }

    // Only allow editing when status = 'draft'
    if (signRequest.status !== 'draft') {
      throw ApiError.badRequest('Cannot edit fields after sign request is sent');
    }

    // Prepare field data
    const fieldData: CreateFieldData[] = fields.map((field) => ({
      sign_request_id: signRequestId,
      document_id: signRequest.document_id,
      assigned_signer_id: field.assigned_signer_id || null,
      type: field.type,
      page: field.page,
      x: field.x,
      y: field.y,
      width: field.width || null,
      height: field.height || null,
      required: field.required !== undefined ? field.required : true,
      label: field.label || null,
      placeholder: field.placeholder || null,
      read_only: field.read_only !== undefined ? field.read_only : false,
    }));

    // Bulk upsert
    await signRequestFieldsRepository.bulkUpsert(signRequestId, fieldData);
  }

  /**
   * Delete a single field
   */
  async deleteField(fieldId: number, tenantId: number, userId: number): Promise<void> {
    // Get field with sign request
    const field = await signRequestFieldsRepository.findById(fieldId);

    if (!field) {
      throw ApiError.notFound('Field not found');
    }

    // Check tenant isolation
    if (field.sign_request.tenant_id !== tenantId) {
      throw ApiError.forbidden('Access denied');
    }

    // Only allow deleting when status = 'draft'
    if (field.sign_request.status !== 'draft') {
      throw ApiError.badRequest('Cannot delete fields after sign request is sent');
    }

    // Delete field
    await signRequestFieldsRepository.delete(fieldId);
  }

  /**
   * Validate fields before sending sign request
   */
  async validateFieldsBeforeSend(signRequestId: number): Promise<ValidationResult> {
    const fields = await signRequestFieldsRepository.findBySignRequest(signRequestId);

    // Check if there are any fields
    if (fields.length === 0) {
      return {
        valid: false,
        message: 'Sign request must have at least one field',
      };
    }

    // Check if all required fields have assigned signer
    const unassignedFields = fields.filter(
      (field) => field.required && !field.assigned_signer_id
    );

    if (unassignedFields.length > 0) {
      return {
        valid: false,
        message: `${unassignedFields.length} required field(s) are not assigned to any signer`,
      };
    }

    return { valid: true };
  }
}

export const signRequestFieldsService = new SignRequestFieldsService();
