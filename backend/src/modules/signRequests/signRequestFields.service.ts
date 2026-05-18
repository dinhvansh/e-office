import { signRequestFieldsRepository, CreateFieldData } from './signRequestFields.repository';
import { signRequestsRepository } from './signRequests.repository';
import { ApiError } from '../../core/errors/api-error';
import { authorizationService } from '../authorization/authorization.service';

export interface FieldInput {
  id?: number;
  assigned_signer_id?: number | null;
  type: string;
  pageIndex: number;
  xPct: number;
  yPct: number;
  widthPct?: number;
  heightPct?: number;
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
  private getApproverTypeLabel(approverType?: string | null) {
    switch (approverType) {
      case 'user':
        return 'Người dùng';
      case 'role':
        return 'Vai trò';
      case 'department':
        return 'Phòng ban';
      case 'manager':
        return 'Quản lý';
      default:
        return 'Participant';
    }
  }

  /**
   * Get editor data (sign request + document + signers + fields)
   */
  async getEditorData(signRequestId: number, tenantId: number, userId: number) {
    // Get sign request with document and signers
    const signRequest = await signRequestsRepository.findById(signRequestId, tenantId);

    if (!signRequest) {
      throw ApiError.notFound('Sign request not found');
    }

    // Check tenant isolation
    if (signRequest.tenant_id !== tenantId) {
      throw ApiError.forbidden('Access denied');
    }

    const decision = await authorizationService.canAccessDocument(
      userId,
      tenantId,
      signRequest.document_id,
      'edit'
    );
    if (!decision.allowed) {
      throw ApiError.forbidden('Permission denied for sign request editor');
    }

    // Get fields
    const fields = await signRequestFieldsRepository.findBySignRequest(signRequestId);

    let participants: Array<{
      key: string;
      kind: 'approver' | 'signer';
      name: string;
      email: string | null;
      order: number;
      signer_id?: number;
    }> = [];

    if (signRequest.document_id) {
      const { prisma } = await import('../../config/prisma');

      const workflow = await prisma.workflows.findFirst({
        where: {
          tenant_id: tenantId,
          created_for_doc: signRequest.document_id,
          is_active: true,
        },
        include: {
          steps: {
            orderBy: { step_order: 'asc' },
          },
        },
        orderBy: { id: 'desc' },
      });

      if (workflow) {
        const userIds = workflow.steps
          .filter((step) => step.approver_type === 'user' && !!step.approver_id)
          .map((step) => step.approver_id as number);

        const users = userIds.length
          ? await prisma.users.findMany({
              where: {
                tenant_id: tenantId,
                id: { in: userIds },
              },
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            })
          : [];

        const userMap = new Map(users.map((item) => [item.id, item]));
        const signerMap = new Map(
          (signRequest.signers || []).map((signer) => [
            `${signer.user_id || ''}:${(signer.email || '').toLowerCase()}`,
            signer,
          ])
        );

        participants = workflow.steps.map((step) => {
          const resolvedUser =
            step.approver_type === 'user' && step.approver_id ? userMap.get(step.approver_id) : null;
          const email = resolvedUser?.email || null;
          const signer =
            step.participant_role === 'signer'
              ? signerMap.get(`${resolvedUser?.id || ''}:${(email || '').toLowerCase()}`) ||
                (signRequest.signers || []).find((item) => item.email && email && item.email.toLowerCase() === email.toLowerCase())
              : undefined;

          return {
            key: `workflow-step-${step.id}`,
            kind: step.participant_role === 'signer' ? 'signer' : 'approver',
            name:
              resolvedUser?.full_name ||
              resolvedUser?.email ||
              step.step_name ||
              this.getApproverTypeLabel(step.approver_type),
            email,
            order: step.step_order,
            signer_id: signer?.id,
          };
        });
      }
    }

    return {
      signRequest,
      fields,
      participants,
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
    const signRequest = await signRequestsRepository.findById(signRequestId, tenantId);

    if (!signRequest) {
      throw ApiError.notFound('Sign request not found');
    }

    // Check tenant isolation
    if (signRequest.tenant_id !== tenantId) {
      throw ApiError.forbidden('Access denied');
    }
    const decision = await authorizationService.canAccessDocument(
      userId,
      tenantId,
      signRequest.document_id,
      'edit'
    );
    if (!decision.allowed) {
      throw ApiError.forbidden('Permission denied to edit fields');
    }

    // Allow editing draft and rejected sign requests
    if (signRequest.status !== 'draft' && signRequest.status !== 'rejected') {
      throw ApiError.badRequest('Cannot edit fields after sign request is sent');
    }

    // Prepare field data
    const validSignerIds = new Set((signRequest.signers || []).map((signer) => signer.id));
    const invalidSignerField = fields.find(
      (field) =>
        field.assigned_signer_id !== undefined &&
        field.assigned_signer_id !== null &&
        !validSignerIds.has(field.assigned_signer_id)
    );

    if (invalidSignerField) {
      throw ApiError.badRequest(
        'Có vị trí ký đang gán cho người ký không còn hợp lệ. Hãy quay lại màn cấu hình để tải lại danh sách người ký.',
        'INVALID_ASSIGNED_SIGNER'
      );
    }

    const fieldData: CreateFieldData[] = fields.map((field) => ({
      sign_request_id: signRequestId,
      document_id: signRequest.document_id,
      assigned_signer_id: field.assigned_signer_id || null,
      type: field.type,
      page: field.pageIndex + 1,
      x: field.xPct,
      y: field.yPct,
      width: field.widthPct ?? null,
      height: field.heightPct ?? null,
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

    const signRequest = await signRequestsRepository.findById(field.sign_request_id, tenantId);
    if (!signRequest) {
      throw ApiError.forbidden('Access denied');
    }
    const decision = await authorizationService.canAccessDocument(
      userId,
      tenantId,
      signRequest.document_id,
      'edit'
    );
    if (!decision.allowed) {
      throw ApiError.forbidden('Permission denied to delete field');
    }

    // Allow editing draft and rejected sign requests
    if (signRequest.status !== 'draft' && signRequest.status !== 'rejected') {
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
