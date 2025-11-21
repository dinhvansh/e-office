import { prisma } from '../../config/prisma';

export class ApprovalsRepository {
  // Workflow Instances
  async createWorkflowInstance(data: {
    document_id: number;
    workflow_id: number;
    current_step_id?: number;
    status?: string;
  }) {
    return prisma.workflow_instances.create({
      data: {
        ...data,
        status: data.status || 'in_progress',
      },
    });
  }

  async findWorkflowInstance(documentId: number) {
    return prisma.workflow_instances.findUnique({
      where: { document_id: documentId },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { step_order: 'asc' },
            },
          },
        },
        current_step: true,
      },
    });
  }

  async updateWorkflowInstance(documentId: number, data: {
    current_step_id?: number;
    status?: string;
    completed_at?: Date;
  }) {
    return prisma.workflow_instances.update({
      where: { document_id: documentId },
      data,
    });
  }

  // Document Approvals
  async createApproval(data: {
    document_id: number;
    workflow_id: number;
    workflow_step_id: number;
    approver_user_id: number;
    due_date?: Date;
  }) {
    return prisma.document_approvals.create({
      data: {
        ...data,
        action: 'pending',
      },
    });
  }

  async createApprovals(approvals: Array<{
    document_id: number;
    workflow_id: number;
    workflow_step_id: number;
    approver_user_id: number;
    due_date?: Date;
  }>) {
    return prisma.document_approvals.createMany({
      data: approvals.map(a => ({
        ...a,
        action: 'pending',
      })),
    });
  }

  async findApprovalById(id: number) {
    return prisma.document_approvals.findUnique({
      where: { id },
      include: {
        document: true,
        workflow: true,
        workflow_step: true,
        approver: true,
      },
    });
  }

  async findPendingApprovals(userId: number, tenantId: number) {
    return prisma.document_approvals.findMany({
      where: {
        approver_user_id: userId,
        action: 'pending',
        document: {
          tenant_id: tenantId,
        },
      },
      include: {
        document: {
          include: {
            document_type: true,
            owner: true,
          },
        },
        workflow: true,
        workflow_step: true,
      },
      orderBy: {
        due_date: 'asc',
      },
    });
  }

  async findDocumentApprovals(documentId: number) {
    return prisma.document_approvals.findMany({
      where: { document_id: documentId },
      include: {
        workflow_step: true,
        approver: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });
  }

  async findStepApprovals(documentId: number, stepId: number) {
    return prisma.document_approvals.findMany({
      where: {
        document_id: documentId,
        workflow_step_id: stepId,
      },
    });
  }

  async updateApproval(id: number, data: {
    action?: string;
    comment?: string;
    acted_at?: Date;
  }) {
    return prisma.document_approvals.update({
      where: { id },
      data,
    });
  }

  // Helper: Get approvers for a step
  async getApproversForStep(stepId: number, tenantId: number): Promise<number[]> {
    const step = await prisma.workflow_steps.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      return [];
    }

    const approverIds: number[] = [];

    switch (step.approver_type) {
      case 'user':
        if (step.approver_id) {
          approverIds.push(step.approver_id);
        }
        break;

      case 'role':
        if (step.approver_id) {
          const usersWithRole = await prisma.user_roles.findMany({
            where: {
              role_id: step.approver_id,
              user: {
                tenant_id: tenantId,
                status: 'active',
              },
            },
            select: { user_id: true },
          });
          approverIds.push(...usersWithRole.map(ur => ur.user_id));
        }
        break;

      case 'department':
        if (step.approver_id) {
          // Get department manager
          const department = await prisma.departments.findUnique({
            where: { id: step.approver_id },
            select: { manager_id: true },
          });
          if (department?.manager_id) {
            approverIds.push(department.manager_id);
          }
        }
        break;

      case 'manager':
        // TODO: Implement direct manager logic
        // For now, return empty
        break;

      case 'position':
        if (step.approver_id) {
          // Get all users with this position
          const usersWithPosition = await prisma.users.findMany({
            where: {
              position_id: step.approver_id,
              tenant_id: tenantId,
              status: 'active',
            },
            select: { id: true },
          });
          approverIds.push(...usersWithPosition.map(u => u.id));
        }
        break;
    }

    return approverIds;
  }
}

export const approvalsRepository = new ApprovalsRepository();
