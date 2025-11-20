import { ApiError } from '../../core/errors/api-error';
import { workflowsRepository } from './workflows.repository';
import { prisma } from '../../config/prisma';

class WorkflowsService {
  // Workflows
  async listWorkflows(tenantId: number) {
    return workflowsRepository.findAll(tenantId);
  }

  async getWorkflow(id: number, tenantId: number) {
    const workflow = await workflowsRepository.findById(id, tenantId);
    if (!workflow) {
      throw ApiError.notFound('Workflow not found', 'WORKFLOW_NOT_FOUND');
    }
    return workflow;
  }

  async getWorkflowByDocumentType(documentTypeId: number, tenantId: number) {
    return workflowsRepository.findByDocumentType(documentTypeId, tenantId);
  }

  async createWorkflow(
    data: {
      name: string;
      description?: string;
      document_type_id?: number;
    },
    tenantId: number,
    userId: number
  ) {
    // Check if workflow with same name exists
    const existing = await prisma.workflows.findFirst({
      where: {
        tenant_id: tenantId,
        name: data.name,
      },
    });

    if (existing) {
      throw ApiError.badRequest('Workflow with this name already exists', 'WORKFLOW_NAME_EXISTS');
    }

    // If document_type_id provided, check if it exists
    if (data.document_type_id) {
      const docType = await prisma.document_types.findFirst({
        where: {
          id: data.document_type_id,
          tenant_id: tenantId,
        },
      });

      if (!docType) {
        throw ApiError.notFound('Document type not found', 'DOCUMENT_TYPE_NOT_FOUND');
      }
    }

    return workflowsRepository.create({
      ...data,
      tenant_id: tenantId,
      created_by: userId,
    });
  }

  async updateWorkflow(
    id: number,
    data: {
      name?: string;
      description?: string;
      document_type_id?: number;
      is_active?: boolean;
    },
    tenantId: number
  ) {
    // Check if workflow exists
    const workflow = await this.getWorkflow(id, tenantId);

    // If changing name, check uniqueness
    if (data.name && data.name !== workflow.name) {
      const existing = await prisma.workflows.findFirst({
        where: {
          tenant_id: tenantId,
          name: data.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw ApiError.badRequest('Workflow with this name already exists', 'WORKFLOW_NAME_EXISTS');
      }
    }

    return workflowsRepository.update(id, data);
  }

  async deleteWorkflow(id: number, tenantId: number) {
    // Check if workflow exists
    await this.getWorkflow(id, tenantId);

    // Check if workflow is in use
    const instanceCount = await prisma.workflow_instances.count({
      where: { workflow_id: id },
    });

    if (instanceCount > 0) {
      throw ApiError.badRequest(
        'Cannot delete workflow that is in use',
        'WORKFLOW_IN_USE'
      );
    }

    return workflowsRepository.delete(id);
  }

  // Workflow Steps
  async getWorkflowSteps(workflowId: number, tenantId: number) {
    // Verify workflow belongs to tenant
    await this.getWorkflow(workflowId, tenantId);
    return workflowsRepository.findSteps(workflowId);
  }

  async createWorkflowStep(
    workflowId: number,
    data: {
      step_name: string;
      approver_type: string;
      approver_id?: number;
      due_in_days?: number;
      is_required?: boolean;
      conditions?: any;
    },
    tenantId: number
  ) {
    // Verify workflow belongs to tenant
    await this.getWorkflow(workflowId, tenantId);

    // Validate approver_type
    const validTypes = ['user', 'role', 'department', 'manager'];
    if (!validTypes.includes(data.approver_type)) {
      throw ApiError.badRequest('Invalid approver type', 'INVALID_APPROVER_TYPE');
    }

    // Get next step order
    const existingSteps = await workflowsRepository.findSteps(workflowId);
    const nextOrder = existingSteps.length > 0
      ? Math.max(...existingSteps.map((s: any) => s.step_order)) + 1
      : 1;

    return workflowsRepository.createStep({
      workflow_id: workflowId,
      step_order: nextOrder,
      ...data,
    });
  }

  async updateWorkflowStep(
    stepId: number,
    data: {
      step_name?: string;
      approver_type?: string;
      approver_id?: number;
      due_in_days?: number;
      is_required?: boolean;
      conditions?: any;
    },
    tenantId: number
  ) {
    // Get step and verify workflow belongs to tenant
    const step = await workflowsRepository.findStepById(stepId);
    if (!step) {
      throw ApiError.notFound('Workflow step not found', 'STEP_NOT_FOUND');
    }

    await this.getWorkflow(step.workflow_id, tenantId);

    // Validate approver_type if provided
    if (data.approver_type) {
      const validTypes = ['user', 'role', 'department', 'manager'];
      if (!validTypes.includes(data.approver_type)) {
        throw ApiError.badRequest('Invalid approver type', 'INVALID_APPROVER_TYPE');
      }
    }

    return workflowsRepository.updateStep(stepId, data);
  }

  async deleteWorkflowStep(stepId: number, tenantId: number) {
    // Get step and verify workflow belongs to tenant
    const step = await workflowsRepository.findStepById(stepId);
    if (!step) {
      throw ApiError.notFound('Workflow step not found', 'STEP_NOT_FOUND');
    }

    await this.getWorkflow(step.workflow_id, tenantId);

    return workflowsRepository.deleteStep(stepId);
  }

  async reorderWorkflowSteps(
    workflowId: number,
    stepOrders: { id: number; step_order: number }[],
    tenantId: number
  ) {
    // Verify workflow belongs to tenant
    await this.getWorkflow(workflowId, tenantId);

    // Verify all steps belong to this workflow
    const steps = await workflowsRepository.findSteps(workflowId);
    const stepIds = steps.map((s: any) => s.id);
    const invalidSteps = stepOrders.filter((so: any) => !stepIds.includes(so.id));

    if (invalidSteps.length > 0) {
      throw ApiError.badRequest('Invalid step IDs', 'INVALID_STEP_IDS');
    }

    return workflowsRepository.reorderSteps(workflowId, stepOrders);
  }

  // Helper: Get available approvers
  async getAvailableApprovers(tenantId: number) {
    const [users, roles, departments] = await Promise.all([
      prisma.users.findMany({
        where: { tenant_id: tenantId, status: 'active' },
        select: { id: true, full_name: true, email: true },
      }),
      prisma.roles.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, name: true },
      }),
      prisma.departments.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, name: true, code: true },
      }),
    ]);

    return { users, roles, departments };
  }
}

export const workflowsService = new WorkflowsService();
