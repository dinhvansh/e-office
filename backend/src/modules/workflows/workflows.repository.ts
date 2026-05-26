import { prisma } from '../../config/prisma';

export class WorkflowsRepository {
  // Workflows
  async findAll(tenantId: number) {
    return prisma.workflows.findMany({
      where: { tenant_id: tenantId },
      include: {
        document_type: true,
        steps: {
          orderBy: { step_order: 'asc' },
        },
        _count: {
          select: {
            instances: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: number, tenantId: number) {
    return prisma.workflows.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        document_type: true,
        steps: {
          orderBy: { step_order: 'asc' },
        },
      },
    });
  }

  async findByDocumentType(documentTypeId: number, tenantId: number) {
    return prisma.workflows.findFirst({
      where: {
        document_type_id: documentTypeId,
        tenant_id: tenantId,
        is_active: true,
      },
      include: {
        steps: {
          orderBy: { step_order: 'asc' },
        },
      },
    });
  }

  async create(data: {
    tenant_id: number;
    name: string;
    description?: string;
    document_type_id?: number;
    created_by?: number;
  }) {
    return prisma.workflows.create({
      data,
      include: {
        document_type: true,
        steps: true,
      },
    });
  }

  async update(id: number, data: {
    name?: string;
    description?: string;
    document_type_id?: number;
    is_active?: boolean;
  }) {
    return prisma.workflows.update({
      where: { id },
      data,
      include: {
        document_type: true,
        steps: true,
      },
    });
  }

  async delete(id: number) {
    return prisma.workflows.delete({
      where: { id },
    });
  }

  // Workflow Steps
  async findSteps(workflowId: number) {
    return prisma.workflow_steps.findMany({
      where: { workflow_id: workflowId },
      orderBy: { step_order: 'asc' },
    });
  }

  async findStepById(stepId: number) {
    return prisma.workflow_steps.findUnique({
      where: { id: stepId },
    });
  }

  async createStep(data: {
    workflow_id: number;
    step_order: number;
    step_name: string;
    approver_type: string;
    approver_id?: number;
    assignee_type?: string | null;
    assignee_user_id?: number | null;
    assignee_department_id?: number | null;
    assignee_position_id?: number | null;
    completion_mode?: string;
    min_required?: number | null;
    participant_role?: string;
    due_in_days?: number;
    is_required?: boolean;
    conditions?: any;
  }) {
    return prisma.workflow_steps.create({
      data,
    });
  }

  async updateStep(stepId: number, data: {
    step_order?: number;
    step_name?: string;
    approver_type?: string;
    approver_id?: number;
    assignee_type?: string | null;
    assignee_user_id?: number | null;
    assignee_department_id?: number | null;
    assignee_position_id?: number | null;
    completion_mode?: string;
    min_required?: number | null;
    participant_role?: string;
    due_in_days?: number;
    is_required?: boolean;
    conditions?: any;
  }) {
    return prisma.workflow_steps.update({
      where: { id: stepId },
      data,
    });
  }

  async deleteStep(stepId: number) {
    return prisma.workflow_steps.delete({
      where: { id: stepId },
    });
  }

  async reorderSteps(workflowId: number, stepOrders: { id: number; step_order: number }[]) {
    // Use transaction to update all steps atomically
    return prisma.$transaction(
      stepOrders.map(({ id, step_order }) =>
        prisma.workflow_steps.update({
          where: { id },
          data: { step_order },
        })
      )
    );
  }
}

export const workflowsRepository = new WorkflowsRepository();
