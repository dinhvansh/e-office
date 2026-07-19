import { ApiError } from '../../core/errors/api-error';
import { workflowsRepository } from './workflows.repository';
import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import {
  getDefaultCompletionMode,
  isWorkflowAssigneeType,
  isWorkflowCompletionMode,
  normalizeWorkflowStepAssignment,
  resolveAssigneeType,
  type WorkflowAssigneeType,
  type WorkflowCompletionMode,
} from './workflowStepAssignment';
import { normalizeWorkflowApprovalMode, type WorkflowApprovalMode } from './workflowApprovalMode';

type WorkflowStepPreviewInput = {
  approver_type: string | null;
  approver_id: number | null;
  assignee_type: string | null;
  assignee_user_id: number | null;
  assignee_department_id: number | null;
  assignee_position_id: number | null;
  completion_mode: string | null;
};

function getWorkflowStepAssigneeType(step: WorkflowStepPreviewInput): WorkflowAssigneeType {
  return resolveAssigneeType({
    approver_type: step.approver_type ?? undefined,
    approver_id: step.approver_id ?? undefined,
    assignee_type: isWorkflowAssigneeType(step.assignee_type) ? step.assignee_type : undefined,
    assignee_user_id: step.assignee_user_id ?? undefined,
    assignee_department_id: step.assignee_department_id ?? undefined,
    assignee_position_id: step.assignee_position_id ?? undefined,
  });
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map((item) => toInputJsonValue(item) ?? Prisma.JsonNull) as Prisma.InputJsonArray;
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toInputJsonValue(item) ?? Prisma.JsonNull]),
    ) as Prisma.InputJsonObject;
  }
  throw ApiError.badRequest('Workflow conditions must be JSON-compatible', 'WORKFLOW_CONDITIONS_INVALID');
}

class WorkflowsService {
  // Workflows
  async listWorkflows(tenantId: number) {
    return workflowsRepository.findAll(tenantId);
  }

  async getWorkflow(id: number, tenantId: number, userId?: number) {
    const workflow = await workflowsRepository.findById(id, tenantId);
    if (!workflow) {
      throw ApiError.notFound('Workflow not found', 'WORKFLOW_NOT_FOUND');
    }
    
    // Enrich steps with approver info
    if (workflow.steps && workflow.steps.length > 0) {
      const enrichedSteps = await Promise.all(
        workflow.steps.map(async (step) => {
          let approverName = '';
          let approverEmail = '';
          const modernPreview = await this.buildStepPreview(step, tenantId, userId);

          if (modernPreview) {
            return {
              ...step,
              ...modernPreview,
            };
          }
          
          if (step.approver_type === 'user' && step.approver_id) {
            const user = await prisma.users.findUnique({
              where: { id: step.approver_id },
              select: { email: true, full_name: true }
            });
            if (user) {
              approverEmail = user.email;
              approverName = user.full_name || user.email;
            }
          } else if (step.approver_type === 'role' && step.approver_id) {
            const role = await prisma.roles.findUnique({
              where: { id: step.approver_id },
              select: { name: true }
            });
            if (role) {
              approverName = `Vai trò: ${role.name}`;
              // Get first user with this role
              const userRole = await prisma.user_roles.findFirst({
                where: { role_id: step.approver_id },
                include: { user: { select: { email: true, full_name: true } } }
              });
              if (userRole?.user) {
                approverEmail = userRole.user.email;
                approverName = userRole.user.full_name || userRole.user.email;
              }
            }
          } else if (step.approver_type === 'department' && step.approver_id) {
            const dept = await prisma.departments.findUnique({
              where: { id: step.approver_id },
              include: { manager: { select: { email: true, full_name: true } } }
            });
            if (dept) {
              approverName = `Phòng ban: ${dept.name}`;
              if (dept.manager) {
                approverEmail = dept.manager.email;
                approverName = dept.manager.full_name || dept.manager.email;
              }
            }
          } else if (step.approver_type === 'manager') {
            // If userId provided, lookup their manager for preview
            if (userId) {
              const currentUser = await prisma.users.findUnique({
                where: { id: userId },
                select: {
                  manager_id: true,
                  manager: {
                    select: {
                      id: true,
                      email: true,
                      full_name: true,
                      status: true
                    }
                  }
                }
              });
              
              if (currentUser?.manager_id && currentUser.manager?.status === 'active') {
                approverName = currentUser.manager.full_name || currentUser.manager.email;
                approverEmail = currentUser.manager.email;
              } else {
                approverName = 'Quản lý trực tiếp';
                approverEmail = '⚠️ Bạn chưa có quản lý';
              }
            } else {
              approverName = 'Quản lý trực tiếp';
              approverEmail = '(Tùy theo người tạo)';
            }
          }
          
          return {
            ...step,
            approver_name: approverName,
            approver_email: approverEmail
          };
        })
      );
      
      return {
        ...workflow,
        steps: enrichedSteps
      };
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
      approval_mode?: WorkflowApprovalMode;
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
      approval_mode: normalizeWorkflowApprovalMode(data.approval_mode),
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
      approval_mode?: WorkflowApprovalMode;
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

    return workflowsRepository.update(id, {
      ...data,
      ...(data.approval_mode !== undefined
        ? { approval_mode: normalizeWorkflowApprovalMode(data.approval_mode) }
        : {}),
    });
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
      approver_type?: string;
      approver_id?: number;
      approver_user_id?: number;
      approver_role_id?: number;
      approver_department_id?: number;
      assignee_type?: WorkflowAssigneeType;
      assignee_user_id?: number;
      assignee_department_id?: number;
      assignee_position_id?: number;
      completion_mode?: WorkflowCompletionMode;
      min_required?: number;
      participant_role?: 'approver' | 'signer';
      due_in_days?: number;
      is_required?: boolean;
      conditions?: unknown;
    },
    tenantId: number
  ) {
    // Verify workflow belongs to tenant
    await this.getWorkflow(workflowId, tenantId);

    const assignment = normalizeWorkflowStepAssignment(data);
    await this.validateWorkflowStepAssignment(assignment, tenantId);

    // Get next step order
    const existingSteps = await workflowsRepository.findSteps(workflowId);
    const nextOrder = existingSteps.length > 0
      ? Math.max(...existingSteps.map((step) => step.step_order)) + 1
      : 1;

    return workflowsRepository.createStep({
      workflow_id: workflowId,
      step_order: nextOrder,
      step_name: data.step_name,
      approver_type: assignment.approver_type,
      approver_id: assignment.approver_id || undefined,
      assignee_type: assignment.assignee_type,
      assignee_user_id: assignment.assignee_user_id,
      assignee_department_id: assignment.assignee_department_id,
      assignee_position_id: assignment.assignee_position_id,
      completion_mode: assignment.completion_mode,
      min_required: assignment.min_required,
      participant_role: data.participant_role || 'approver',
      due_in_days: data.due_in_days,
      is_required: data.is_required,
      conditions: toInputJsonValue(data.conditions),
    });
  }

  async updateWorkflowStep(
    stepId: number,
    data: {
      step_name?: string;
      approver_type?: string;
      approver_id?: number;
      approver_user_id?: number;
      approver_role_id?: number;
      approver_department_id?: number;
      assignee_type?: WorkflowAssigneeType;
      assignee_user_id?: number;
      assignee_department_id?: number;
      assignee_position_id?: number;
      completion_mode?: WorkflowCompletionMode;
      min_required?: number;
      participant_role?: 'approver' | 'signer';
      due_in_days?: number;
      is_required?: boolean;
      conditions?: unknown;
    },
    tenantId: number
  ) {
    // Get step and verify workflow belongs to tenant
    const step = await workflowsRepository.findStepById(stepId);
    if (!step) {
      throw ApiError.notFound('Workflow step not found', 'STEP_NOT_FOUND');
    }

    await this.getWorkflow(step.workflow_id, tenantId);

    const shouldUpdateAssignment =
      data.approver_type !== undefined ||
      data.approver_id !== undefined ||
      data.approver_user_id !== undefined ||
      data.approver_role_id !== undefined ||
      data.approver_department_id !== undefined ||
      data.assignee_type !== undefined ||
      data.assignee_user_id !== undefined ||
      data.assignee_department_id !== undefined ||
      data.assignee_position_id !== undefined ||
      data.completion_mode !== undefined ||
      data.min_required !== undefined;

    let assignment = null as ReturnType<typeof normalizeWorkflowStepAssignment> | null;
    if (shouldUpdateAssignment) {
      assignment = normalizeWorkflowStepAssignment({
        approver_type: data.approver_type ?? step.approver_type,
        approver_id: data.approver_id ?? step.approver_id ?? undefined,
        approver_user_id: data.approver_user_id ?? step.assignee_user_id ?? undefined,
        approver_department_id: data.approver_department_id ?? step.assignee_department_id ?? undefined,
        assignee_type: data.assignee_type ?? getWorkflowStepAssigneeType(step),
        assignee_user_id: data.assignee_user_id ?? step.assignee_user_id ?? undefined,
        assignee_department_id: data.assignee_department_id ?? step.assignee_department_id ?? undefined,
        assignee_position_id: data.assignee_position_id ?? step.assignee_position_id ?? undefined,
        completion_mode: data.completion_mode ?? (step.completion_mode as WorkflowCompletionMode | undefined),
        min_required: data.min_required ?? step.min_required ?? undefined,
      });
      await this.validateWorkflowStepAssignment(assignment, tenantId);
    }

    return workflowsRepository.updateStep(stepId, {
      step_name: data.step_name,
      approver_type: assignment?.approver_type,
      approver_id: assignment?.approver_id || undefined,
      assignee_type: assignment?.assignee_type,
      assignee_user_id: assignment?.assignee_user_id,
      assignee_department_id: assignment?.assignee_department_id,
      assignee_position_id: assignment?.assignee_position_id,
      completion_mode: assignment?.completion_mode,
      min_required: assignment?.min_required,
      participant_role: data.participant_role,
      due_in_days: data.due_in_days,
      is_required: data.is_required,
      conditions: toInputJsonValue(data.conditions),
    });
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
    const stepIds = steps.map((step) => step.id);
    const invalidSteps = stepOrders.filter((stepOrder) => !stepIds.includes(stepOrder.id));

    if (invalidSteps.length > 0) {
      throw ApiError.badRequest('Invalid step IDs', 'INVALID_STEP_IDS');
    }

    return workflowsRepository.reorderSteps(workflowId, stepOrders);
  }

  // Helper: Get available approvers
  async getAvailableApprovers(tenantId: number) {
    const [users, departments, positions] = await Promise.all([
      prisma.users.findMany({
        where: { tenant_id: tenantId, status: 'active' },
        select: { id: true, full_name: true, email: true, department_id: true, position_id: true },
      }),
      prisma.departments.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, name: true, code: true, manager_id: true },
      }),
      prisma.positions.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, name: true, code: true },
      }),
    ]);

    return { users, departments, positions };
  }

  private async buildStepPreview(step: WorkflowStepPreviewInput, tenantId: number, userId?: number) {
    const assigneeType = getWorkflowStepAssigneeType(step);
    const completionMode = isWorkflowCompletionMode(step.completion_mode)
      ? step.completion_mode
      : getDefaultCompletionMode(assigneeType);

    if (assigneeType === 'specific_user' && (step.assignee_user_id || step.approver_id)) {
      const user = await prisma.users.findUnique({
        where: { id: step.assignee_user_id || step.approver_id || 0 },
        select: { email: true, full_name: true },
      });

      if (user) {
        return {
          assignee_type: assigneeType,
          completion_mode: completionMode,
          approver_name: user.full_name || user.email,
          approver_email: user.email,
        };
      }
    }

    if (assigneeType === 'department_manager' && (step.assignee_department_id || step.approver_id)) {
      const department = await prisma.departments.findUnique({
        where: { id: step.assignee_department_id || step.approver_id || 0 },
        include: {
          manager: {
            select: { email: true, full_name: true },
          },
        },
      });

      if (department) {
        return {
          assignee_type: assigneeType,
          completion_mode: completionMode,
          approver_name: department.manager?.full_name || department.manager?.email || `TrÆ°á»Ÿng phÃ²ng ${department.name}`,
          approver_email: department.manager?.email || 'ChÆ°a cÃ³ trÆ°á»Ÿng phÃ²ng',
        };
      }
    }

    if (assigneeType === 'position_in_department' && step.assignee_department_id && step.assignee_position_id) {
      const [department, position, matchedCount] = await Promise.all([
        prisma.departments.findUnique({
          where: { id: step.assignee_department_id },
          select: { name: true },
        }),
        prisma.positions.findUnique({
          where: { id: step.assignee_position_id },
          select: { name: true },
        }),
        prisma.users.count({
          where: {
            tenant_id: tenantId,
            department_id: step.assignee_department_id,
            position_id: step.assignee_position_id,
            status: 'active',
          },
        }),
      ]);

      return {
        assignee_type: assigneeType,
        completion_mode: completionMode,
        approver_name: `${position?.name || 'Chá»©c danh'} - ${department?.name || 'PhÃ²ng ban'}`,
        approver_email: `${matchedCount} ngÆ°á»i phÃ¹ há»£p`,
      };
    }

    if (assigneeType === 'direct_manager') {
      if (userId) {
        const currentUser = await prisma.users.findUnique({
          where: { id: userId },
          select: {
            manager_id: true,
            manager: {
              select: {
                email: true,
                full_name: true,
                status: true,
              },
            },
          },
        });

        return {
          assignee_type: assigneeType,
          completion_mode: completionMode,
          approver_name:
            currentUser?.manager_id && currentUser.manager?.status === 'active'
              ? currentUser.manager.full_name || currentUser.manager.email
              : 'Quáº£n lÃ½ trá»±c tiáº¿p',
          approver_email:
            currentUser?.manager_id && currentUser.manager?.status === 'active'
              ? currentUser.manager.email
              : 'âš ï¸ Báº¡n chÆ°a cÃ³ quáº£n lÃ½',
        };
      }

      return {
        assignee_type: assigneeType,
        completion_mode: completionMode,
        approver_name: 'Quáº£n lÃ½ trá»±c tiáº¿p',
        approver_email: '(TÃ¹y theo ngÆ°á»i táº¡o)',
      };
    }

    return null;
  }

  private async validateWorkflowStepAssignment(
    assignment: ReturnType<typeof normalizeWorkflowStepAssignment>,
    tenantId: number,
  ) {
    if (assignment.completion_mode === 'min_n' && (!assignment.min_required || assignment.min_required < 1)) {
      throw ApiError.badRequest('Minimum required must be at least 1', 'INVALID_MIN_REQUIRED');
    }

    if (assignment.assignee_type === 'specific_user' && !assignment.assignee_user_id) {
      throw ApiError.badRequest('Specific user is required', 'ASSIGNEE_USER_REQUIRED');
    }

    if (assignment.assignee_type === 'department_manager' && !assignment.assignee_department_id) {
      throw ApiError.badRequest('Department is required', 'ASSIGNEE_DEPARTMENT_REQUIRED');
    }

    if (assignment.assignee_type === 'position_in_department') {
      if (!assignment.assignee_department_id || !assignment.assignee_position_id) {
        throw ApiError.badRequest(
          'Department and position are required',
          'ASSIGNEE_POSITION_DEPARTMENT_REQUIRED',
        );
      }

      if (assignment.completion_mode === 'min_n' && assignment.min_required) {
        const matchedCount = await prisma.users.count({
          where: {
            tenant_id: tenantId,
            department_id: assignment.assignee_department_id,
            position_id: assignment.assignee_position_id,
            status: 'active',
          },
        });

        if (assignment.min_required > matchedCount) {
          throw ApiError.badRequest(
            'Minimum required exceeds matching users in the selected department and position',
            'MIN_REQUIRED_EXCEEDS_MATCHES',
          );
        }
      }
    }
  }
}

export const workflowsService = new WorkflowsService();
