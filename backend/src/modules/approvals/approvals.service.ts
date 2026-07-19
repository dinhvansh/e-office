import { ApiError } from '../../core/errors/api-error';
import { approvalsRepository } from './approvals.repository';
import { prisma, type DbClient } from '../../config/prisma';
import { emailService } from '../common/email.service';
import { signRequestsService } from '../signRequests/signRequests.service';
import { notificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import { authorizationService } from '../authorization/authorization.service';
import {
  getDefaultCompletionMode,
  isWorkflowAssigneeType,
  isWorkflowCompletionMode,
  resolveAssigneeType,
} from '../workflows/workflowStepAssignment';
import { Prisma, type documents } from '@prisma/client';

type CombinedTask = {
  task_type: 'approval' | 'signing';
  task_id: number;
  document_id: number;
  document_number: string | null;
  document_title: string | null;
  document_type: { id: number } | null;
  owner: unknown;
  status: string | null;
  created_at: Date;
  due_date: Date | null;
  [key: string]: unknown;
};
import { isApprovalStepComplete } from './approvalCompletion.policy';
import { normalizeWorkflowApprovalMode } from '../workflows/workflowApprovalMode';
import {
  initialApprovalAction,
  initialCurrentStepId,
  isApprovalActionableInRun,
  isParallelApprovalComplete,
} from './approvalModeRuntime.policy';
import { workflowStateService } from '../workflows/workflowState.service';
import { buildWorkflowStatusSummary } from '../signRequests/signRequestFlow.policy';
import { documentsService } from '../documents/documents.service';
import { outboxDeliveryService } from '../outbox/outboxDelivery.service';

async function createApprovalTaskNotification(
  db: DbClient,
  input: {
    tenantId: number;
    workflowInstanceId: number;
    approvalId: number;
    approver: { id: number; email: string; full_name: string | null };
    document: { title: string | null; document_number: string | null };
    submitterName: string;
    workflowName: string;
    stepName: string;
    dueDate: Date;
    approvalUrl: string;
  },
): Promise<void> {
  await outboxDeliveryService.enqueueEmail(db, {
    tenantId: input.tenantId,
    aggregateType: 'document_approval',
    aggregateId: input.approvalId,
    template: 'approval_request',
    data: {
      tenantId: input.tenantId,
      recipientEmail: input.approver.email,
      recipientName: input.approver.full_name || input.approver.email,
      documentTitle: input.document.title || 'Untitled',
      documentNumber: input.document.document_number || '',
      submitterName: input.submitterName,
      workflowName: input.workflowName,
      stepName: input.stepName,
      dueDate: input.dueDate,
      approvalUrl: input.approvalUrl,
    },
    deduplicationKey: `approval-request:${input.workflowInstanceId}:${input.approvalId}`,
  });
  await db.notifications.create({
    data: {
      tenant_id: input.tenantId,
      user_id: input.approver.id,
      type: NotificationType.APPROVAL_REQUEST,
      title: 'YÃªu cáº§u phÃª duyá»‡t má»›i',
      message: `TÃ i liá»‡u "${input.document.title || 'Untitled'}" cáº§n phÃª duyá»‡t cá»§a báº¡n`,
      link: `/approvals?filter=pending&approvalId=${input.approvalId}`,
    },
  });
}

function isPrismaSerializationConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const prismaError = error as { code?: unknown; meta?: { code?: unknown } };
  return prismaError.code === 'P2034'
    || (prismaError.code === 'P2010' && prismaError.meta?.code === '40001');
}

class ApprovalsService {
  /**
   * List all approvals for a tenant
   */
  async listApprovals(tenantId: number, userId: number, role?: string | null) {
    const isAdmin = role === 'admin';

    return await prisma.document_approvals.findMany({
      where: {
        document: {
          tenant_id: tenantId
        },
        ...(isAdmin ? {} : { approver_user_id: userId })
      },
      include: {
        document: {
          select: { id: true, title: true, status: true }
        },
        workflow_step: {
          select: { step_name: true, step_order: true }
        },
        approver: {
          select: { id: true, email: true, full_name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Get approval by ID with full details
   */
  async getApprovalById(approvalId: number, userId: number, tenantId: number) {
    const approval = await prisma.document_approvals.findFirst({
      where: {
        id: approvalId,
      },
      include: {
        document: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                full_name: true,
              }
            }
          }
        },
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        workflow_step: {
          select: {
            id: true,
            step_order: true,
            step_name: true,
            approver_type: true,
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
            full_name: true,
          }
        }
      }
    });

    if (!approval) {
      throw ApiError.notFound('Approval not found', 'APPROVAL_NOT_FOUND');
    }

    // Verify tenant through document
    if (approval.document.tenant_id !== tenantId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }

    // Check if user is the approver
    if (approval.approver_user_id !== userId) {
      throw ApiError.forbidden('You are not authorized to view this approval', 'NOT_AUTHORIZED');
    }

    return {
      ...approval,
      status_summary: buildWorkflowStatusSummary({
        status: approval.action === 'pending' ? 'pending_approval' : approval.action,
        signers: [],
        deadline: approval.due_date,
      }),
    };
  }

  async listComments(approvalId: number, userId: number, tenantId: number) {
    const approval = await this.getApprovalById(approvalId, userId, tenantId);
    const signRequestId = approval.document.sign_request_id;
    if (!signRequestId) {
      return [];
    }

    return prisma.sign_request_comments.findMany({
      where: {
        tenant_id: tenantId,
        sign_request_id: signRequestId,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        attachments: { include: { uploader: { select: { id: true, full_name: true, email: true } } } },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async addComment(approvalId: number, userId: number, tenantId: number, body: string, attachments: Array<{ file_name: string; file_base64: string; file_type?: string }> = []) {
    const content = body.trim();
    if (!content) {
      throw ApiError.badRequest('Comment is required', 'COMMENT_REQUIRED');
    }
    if (content.length > 2000) {
      throw ApiError.badRequest('Comment must be 2000 characters or less', 'COMMENT_TOO_LONG');
    }

    const approval = await this.getApprovalById(approvalId, userId, tenantId);
    const signRequestId = approval.document.sign_request_id;
    if (!signRequestId) {
      throw ApiError.badRequest('This approval document does not have a signing discussion thread', 'DISCUSSION_NOT_AVAILABLE');
    }

    const comment = await prisma.sign_request_comments.create({
      data: {
        tenant_id: tenantId,
        sign_request_id: signRequestId,
        user_id: userId,
        body: content,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    const ownerId = approval.document.owner_id;
    if (ownerId && ownerId !== userId) {
      const commenter = comment.user?.full_name || comment.user?.email || 'Người dùng';
      await notificationsService.createNotification({
        tenantId,
        userId: ownerId,
        type: NotificationType.DOCUMENT_COMMENTED,
        title: 'Có bình luận mới trong luồng phê duyệt',
        message: `${commenter} đã bình luận trên tài liệu "${approval.document.title || approval.document.original_file_name || 'Untitled'}"`,
        link: `/documents/${approval.document_id}/flow#discussion`,
      });
    }

    for (const attachment of attachments) {
      await documentsService.addAttachment(approval.document_id, tenantId, userId, { ...attachment, attachment_kind: 'COMMENT_ATTACHMENT', comment_id: comment.id });
    }
    return prisma.sign_request_comments.findUniqueOrThrow({
      where: { id: comment.id },
      include: {
        user: { select: { id: true, full_name: true, email: true } },
        attachments: { include: { uploader: { select: { id: true, full_name: true, email: true } } } },
      },
    });
  }

  /**
   * Submit document for approval
   * Creates workflow instance and approval records for first step
   */
  async submitForApproval(
    documentId: number,
    workflowId: number,
    tenantId: number,
    userId: number
  ) {
    // Check if document exists and belongs to tenant
    const document = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });

    if (!document) {
      throw ApiError.notFound('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    // Check if document already has workflow instance
    const existingInstance = await approvalsRepository.findWorkflowInstance(documentId);
    if (existingInstance) {
      throw ApiError.badRequest(
        'Document already has an active workflow',
        'WORKFLOW_ALREADY_EXISTS'
      );
    }

    // Get workflow with steps
    const workflow = await prisma.workflows.findFirst({
      where: {
        id: workflowId,
        tenant_id: tenantId,
        is_active: true,
      },
      include: {
        steps: {
          orderBy: { step_order: 'asc' },
        },
      },
    });

    if (!workflow) {
      throw ApiError.notFound('Workflow not found', 'WORKFLOW_NOT_FOUND');
    }

    if (workflow.steps.length === 0) {
      throw ApiError.badRequest('Workflow has no steps', 'WORKFLOW_NO_STEPS');
    }

    // ✅ Filter only approver steps (not signer steps)
    const approverSteps = workflow.steps.filter(
      step => step.participant_role === 'approver' || !step.participant_role // backward compatibility
    );

    if (approverSteps.length === 0) {
      throw ApiError.badRequest('Workflow has no approver steps', 'WORKFLOW_NO_APPROVER_STEPS');
    }

    // Get first approver step
    const firstStep = approverSteps[0];

    // Get approvers for first step
    const approverIds = await approvalsRepository.getApproversForStep(
      firstStep.id,
      tenantId,
      documentId // Pass documentId for manager lookup
    );

    if (approverIds.length === 0) {
      // Check if it's a manager step and provide specific error
      if (firstStep.approver_type === 'manager') {
        throw ApiError.badRequest(
          'Bạn chưa được phân công quản lý trực tiếp. Vui lòng liên hệ admin để cập nhật thông tin.',
          'NO_MANAGER_ASSIGNED'
        );
      }
      throw ApiError.badRequest(
        'Không tìm thấy người phê duyệt cho bước đầu tiên',
        'NO_APPROVERS_FOUND'
      );
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + firstStep.due_in_days);

    const approvalMode = normalizeWorkflowApprovalMode(workflow.approval_mode);

    // Resolve every assignment before creating the run so a missing later-step
    // assignee cannot leave an orphaned active workflow instance.
    const assignmentPlans = [] as Array<{
      stepId: number;
      stepIndex: number;
      approverIds: number[];
      dueDate: Date;
    }>;
    for (const [index, step] of approverSteps.entries()) {
      const stepApproverIds = index === 0
        ? approverIds
        : await approvalsRepository.getApproversForStep(step.id, tenantId, documentId);
      if (stepApproverIds.length === 0) {
        throw ApiError.badRequest('No approvers found for workflow step', 'NO_APPROVERS_FOUND');
      }
      const stepDueDate = new Date();
      stepDueDate.setDate(stepDueDate.getDate() + step.due_in_days);
      assignmentPlans.push({
        stepId: step.id,
        stepIndex: index,
        approverIds: stepApproverIds,
        dueDate: stepDueDate,
      });
    }

    const actionablePlans = assignmentPlans.filter(
      (plan) => initialApprovalAction(approvalMode, plan.stepIndex) === 'pending',
    );
    const actionableApproverIds = [...new Set(
      actionablePlans.flatMap((plan) => plan.approverIds),
    )];
    const candidateAssigneeIds = [...new Set(
      assignmentPlans.flatMap((plan) => plan.approverIds),
    )];

    // Resolve submitter display data before opening the write transaction.
    const submitter = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true },
    });

    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/approvals`;

    const createRuntimeTransaction = () => prisma.$transaction(async (tx) => {
      // Serialize submissions for the same document. The partial unique index
      // on active runs provides a second database-level invariant.
      const lockedDocuments = await tx.$queryRaw<Array<{
        id: number;
        status: string | null;
        sign_request_id: number | null;
      }>>`
        SELECT "id", "status", "sign_request_id"
        FROM "documents"
        WHERE "id" = ${documentId} AND "tenant_id" = ${tenantId}
        FOR UPDATE
      `;
      const lockedDocument = lockedDocuments[0];
      if (!lockedDocument) {
        throw ApiError.notFound('Document not found', 'DOCUMENT_NOT_FOUND');
      }

      const activeInstance = await tx.workflow_instances.findFirst({
        where: { document_id: documentId, status: 'in_progress' },
        select: { id: true },
      });
      if (activeInstance) {
        throw ApiError.badRequest('Document already has an active workflow', 'WORKFLOW_ALREADY_EXISTS');
      }
      if (lockedDocument.status !== 'draft') {
        throw ApiError.badRequest('Document must be in draft status', 'INVALID_STATUS');
      }

      // Pre-resolution only produces candidates. Revalidate every unique user
      // under a row lock so an admin cannot deactivate an assignee between this
      // check and commit. FOR SHARE conflicts with user UPDATE/DELETE while
      // allowing concurrent read-only runtime validation.
      const validAssignees = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT "id"
        FROM "users"
        WHERE "tenant_id" = ${tenantId}
          AND "status" = 'active'
          AND "id" IN (${Prisma.join(candidateAssigneeIds)})
        FOR SHARE
      `);
      const validAssigneeIds = new Set(validAssignees.map((user) => user.id));
      if (
        validAssigneeIds.size !== candidateAssigneeIds.length
        || candidateAssigneeIds.some((assigneeId) => !validAssigneeIds.has(assigneeId))
      ) {
        throw ApiError.conflict(
          'One or more workflow approvers are no longer active in this tenant',
          'APPROVAL_ASSIGNEE_INACTIVE',
        );
      }

      const createdInstance = await approvalsRepository.createWorkflowInstance({
        document_id: documentId,
        workflow_id: workflowId,
        current_step_id: initialCurrentStepId(approvalMode, firstStep.id),
        status: 'in_progress',
      }, tx);

      // createMany is one SQL statement. Combined with the outer transaction,
      // neither sequential nor parallel approvals can be partially committed.
      const approvals = assignmentPlans.flatMap((plan) =>
        plan.approverIds.map((approverId) => ({
          document_id: documentId,
          workflow_id: workflowId,
          workflow_step_id: plan.stepId,
          workflow_instance_id: createdInstance.id,
          approver_user_id: approverId,
          due_date: plan.dueDate,
          action: initialApprovalAction(approvalMode, plan.stepIndex),
        })),
      );
      await approvalsRepository.createApprovals(approvals, tx);

      await tx.documents.update({
        where: { id: documentId },
        data: { status: 'pending_approval' },
      });
      if (lockedDocument.sign_request_id) {
        const requestUpdate = await tx.sign_requests.updateMany({
          where: { id: lockedDocument.sign_request_id, tenant_id: tenantId },
          data: { status: 'pending_approval' },
        });
        if (requestUpdate.count !== 1) {
          throw ApiError.conflict('Linked sign request not found', 'SIGN_REQUEST_NOT_FOUND');
        }
        await tx.signers.updateMany({
          where: { sign_request_id: lockedDocument.sign_request_id, status: 'draft' },
          data: { status: 'waiting_approval' },
        });
      }

      const activeApprovals = await tx.document_approvals.findMany({
        where: { workflow_instance_id: createdInstance.id, action: 'pending' },
        include: {
          approver: { select: { id: true, email: true, full_name: true } },
          workflow_step: { select: { step_name: true, step_order: true } },
        },
      });
      for (const activeApproval of activeApprovals) {
        await createApprovalTaskNotification(tx, {
          tenantId,
          workflowInstanceId: createdInstance.id,
          approvalId: activeApproval.id,
          approver: activeApproval.approver,
          document: { title: document.title, document_number: document.document_number },
          submitterName: submitter?.full_name || submitter?.email || 'Unknown',
          workflowName: workflow.name,
          stepName: activeApproval.workflow_step.step_name || `BÆ°á»›c ${activeApproval.workflow_step.step_order}`,
          dueDate: activeApproval.due_date || dueDate,
          approvalUrl,
        });
      }

      return createdInstance;
    }, { isolationLevel: 'Serializable' });

    let instance: Awaited<ReturnType<typeof createRuntimeTransaction>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        instance = await createRuntimeTransaction();
        break;
      } catch (error) {
        if (!isPrismaSerializationConflict(error) || attempt === 2) throw error;
      }
    }
    if (!instance) {
      throw ApiError.conflict('Workflow runtime could not be created', 'WORKFLOW_RUNTIME_CONFLICT');
    }

    return {
      instance,
      approvals: actionableApproverIds.length,
      message: `Document submitted for approval. ${actionableApproverIds.length} approver(s) notified.`,
    };
  }

  /**
   * Approve a document
   * Moves to next step or completes workflow
   */
  async approve(
    approvalId: number,
    userId: number,
    tenantId: number,
    comment?: string,
    signatureData?: string,
    signatureType?: 'drawn' | 'uploaded' | 'typed' | 'certificate'
  ) {
    // Get approval record
    const approval = await approvalsRepository.findApprovalById(approvalId);

    if (!approval) {
      throw ApiError.notFound('Approval not found', 'APPROVAL_NOT_FOUND');
    }

    // Verify approver
    if (approval.approver_user_id !== userId) {
      throw ApiError.forbidden('You are not the approver', 'NOT_APPROVER');
    }

    // Verify tenant
    if (approval.document.tenant_id !== tenantId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }

    // Check if already acted
    if (approval.action !== 'pending') {
      throw ApiError.badRequest(
        `Approval already ${approval.action}`,
        'APPROVAL_ALREADY_ACTED'
      );
    }

    const approvalMode = normalizeWorkflowApprovalMode(approval.workflow.approval_mode);
    const activeRun = await prisma.workflow_instances.findFirst({
      where: { id: approval.workflow_instance_id, document_id: approval.document_id, status: 'in_progress' },
      select: { current_step_id: true },
    });
    if (!activeRun || !isApprovalActionableInRun({
      mode: approvalMode,
      approvalAction: approval.action,
      workflowRunStatus: 'in_progress',
      currentStepId: activeRun.current_step_id,
      approvalStepId: approval.workflow_step_id,
      documentStatus: approval.document.status,
    })) {
      throw ApiError.conflict('Approval is not in the active workflow run', 'APPROVAL_RUN_NOT_ACTIVE');
    }

    const workflowStep = approval.workflow_step;
    const assigneeType = resolveAssigneeType({
      approver_type: workflowStep.approver_type ?? undefined,
      approver_id: workflowStep.approver_id ?? undefined,
      assignee_type: isWorkflowAssigneeType(workflowStep.assignee_type) ? workflowStep.assignee_type : undefined,
      assignee_user_id: workflowStep.assignee_user_id ?? undefined,
      assignee_department_id: workflowStep.assignee_department_id ?? undefined,
      assignee_position_id: workflowStep.assignee_position_id ?? undefined,
    });
    const completionMode = isWorkflowCompletionMode(workflowStep.completion_mode)
      ? workflowStep.completion_mode
      : getDefaultCompletionMode(assigneeType);

    const minRequired =
      completionMode === 'min_n'
        ? Math.max(1, Number(workflowStep.min_required || 1))
        : null;

    const approverSteps = await prisma.workflow_steps.findMany({
      where: {
        workflow_id: approval.workflow_id,
        OR: [{ participant_role: null }, { participant_role: { not: 'signer' } }],
      },
      orderBy: { step_order: 'asc' },
    });
    const currentStepIndex = approverSteps.findIndex((step) => step.id === approval.workflow_step_id);
    const nextStepForTransition = approvalMode === 'sequential'
      ? approverSteps[currentStepIndex + 1] ?? null
      : null;

    const runApprovalTransaction = () => prisma.$transaction(async (tx) => {
      const markedApproved = await tx.document_approvals.updateMany({
        where: {
          id: approvalId,
          approver_user_id: userId,
          action: 'pending',
          workflow_instance_id: approval.workflow_instance_id,
          workflow_instance: {
            status: 'in_progress',
            ...(approvalMode === 'sequential'
              ? { current_step_id: approval.workflow_step_id }
              : {}),
          },
          document: {
            tenant_id: tenantId,
            status: 'pending_approval',
            ...(approval.document.sign_request_id
              ? { sign_request: { is: { status: { notIn: ['cancelled', 'archived', 'completed', 'rejected'] } } } }
              : {}),
          },
        },
        data: {
          action: 'approved', comment, signature_data: signatureData,
          signature_type: signatureType, acted_at: new Date(),
        },
      });
      if (markedApproved.count !== 1) {
        throw ApiError.conflict('Approval was already processed', 'CONCURRENT_MODIFICATION');
      }
      const approvals = await tx.document_approvals.findMany({
        where: approvalMode === 'parallel'
          ? { workflow_instance_id: approval.workflow_instance_id }
          : { workflow_instance_id: approval.workflow_instance_id, workflow_step_id: approval.workflow_step_id },
      });
      const complete = approvalMode === 'parallel'
        ? isParallelApprovalComplete(approvals.map((item) => item.action))
        : isApprovalStepComplete(
            approvals.map((item) => item.action),
            completionMode as 'all' | 'any_one' | 'min_n',
            minRequired,
          );
      if (approvalMode === 'sequential' && complete && (completionMode === 'any_one' || completionMode === 'min_n')) {
        await tx.document_approvals.updateMany({
          where: {
            workflow_instance_id: approval.workflow_instance_id,
            workflow_step_id: approval.workflow_step_id,
            action: { in: ['pending', 'waiting'] },
          },
          data: {
            action: 'skipped',
            comment: completionMode === 'any_one' ? 'Step completed by another approver' : 'Step threshold reached',
            acted_at: new Date(),
          },
        });
      }
      if (complete && nextStepForTransition) {
        await tx.document_approvals.updateMany({
          where: { workflow_instance_id: approval.workflow_instance_id, workflow_step_id: nextStepForTransition.id, action: 'waiting' },
          data: { action: 'pending' },
        });
        const movedRun = await tx.workflow_instances.updateMany({
          where: { id: approval.workflow_instance_id, status: 'in_progress' },
          data: { current_step_id: nextStepForTransition.id },
        });
        if (movedRun.count !== 1) {
          throw ApiError.conflict('Workflow run is no longer active', 'APPROVAL_RUN_NOT_ACTIVE');
        }
        await tx.outbox_events.create({
          data: {
            tenant_id: tenantId, aggregate_type: 'workflow_instance', aggregate_id: String(approval.document_id),
            event_type: 'APPROVAL_STEP_ACTIVATED',
            payload: { document_id: approval.document_id, workflow_instance_id: approval.workflow_instance_id, workflow_step_id: nextStepForTransition.id },
            deduplication_key: `approval-step-activated:${approval.workflow_instance_id}:${nextStepForTransition.id}`,
          },
        });
        const activatedApprovals = await tx.document_approvals.findMany({
          where: {
            workflow_instance_id: approval.workflow_instance_id,
            workflow_step_id: nextStepForTransition.id,
            action: 'pending',
          },
          include: {
            approver: { select: { id: true, email: true, full_name: true } },
            document: {
              select: {
                title: true,
                document_number: true,
                owner: { select: { full_name: true, email: true } },
              },
            },
          },
        });
        const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/approvals`;
        for (const activatedApproval of activatedApprovals) {
          await createApprovalTaskNotification(tx, {
            tenantId,
            workflowInstanceId: approval.workflow_instance_id,
            approvalId: activatedApproval.id,
            approver: activatedApproval.approver,
            document: activatedApproval.document,
            submitterName: activatedApproval.document.owner?.full_name || activatedApproval.document.owner?.email || 'Unknown',
            workflowName: approval.workflow.name,
            stepName: nextStepForTransition.step_name || `BÆ°á»›c ${nextStepForTransition.step_order}`,
            dueDate: activatedApproval.due_date || new Date(),
            approvalUrl,
          });
        }
      } else if (complete) {
        const completedRun = await tx.workflow_instances.updateMany({
          where: { id: approval.workflow_instance_id, status: 'in_progress' },
          data: { status: 'completed', completed_at: new Date(), current_step_id: null },
        });
        if (completedRun.count !== 1) {
          throw ApiError.conflict('Workflow run is no longer active', 'APPROVAL_RUN_NOT_ACTIVE');
        }
        await tx.outbox_events.create({
          data: {
            tenant_id: tenantId, aggregate_type: 'workflow_instance', aggregate_id: String(approval.document_id),
            event_type: 'APPROVAL_WORKFLOW_COMPLETED',
            payload: { document_id: approval.document_id, workflow_id: approval.workflow_id, workflow_instance_id: approval.workflow_instance_id },
            deduplication_key: `approval-workflow-completed:${approval.workflow_instance_id}`,
          },
        });
      }
      return { isStepComplete: complete, nextStep: nextStepForTransition };
    }, { isolationLevel: 'Serializable' });
    let transition: Awaited<ReturnType<typeof runApprovalTransaction>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        transition = await runApprovalTransaction();
        break;
      } catch (error) {
        if (!isPrismaSerializationConflict(error) || attempt === 2) throw error;
      }
    }
    if (!transition) {
      throw ApiError.conflict('Approval was already processed', 'CONCURRENT_MODIFICATION');
    }
    const { isStepComplete, nextStep } = transition;

    if (!isStepComplete) {
      // Still waiting for other approvers in this step
      return {
        message: 'Approval recorded. Waiting for other approvers in this step.',
        status: 'waiting',
      };
    }

    // ⭐ SEQUENTIAL APPROVAL: Current step is complete, activate next step
    console.log(`[Sequential Approval] Step ${approval.workflow_step_id} completed`);
    
    // Get workflow instance to find next step
    const instance = await prisma.workflow_instances.findUnique({
      where: { id: approval.workflow_instance_id },
      include: { workflow: true },
    });
    
    if (!instance) {
      throw ApiError.notFound('Workflow instance not found', 'INSTANCE_NOT_FOUND');
    }
    
    // Get all approver steps (not signer steps)
    if (nextStep) {
      // ⭐ Activate next step: change 'waiting' → 'pending'
      console.log(`[Sequential Approval] Activating next step: ${nextStep.step_name} (ID: ${nextStep.id})`);
      
      return {
        message: `Step approved! Moved to next step: ${nextStep.step_name}`,
        status: 'next_step',
        nextStep: {
          id: nextStep.id,
          name: nextStep.step_name,
          order: nextStep.step_order
        }
      };
    }
    
    // ✅ No more steps - all approvals complete!

    // ✅ ALL approvals are done! Move to signing phase
    console.log(`[Sequential Approval] All approval steps completed!`);
    
    // Mark workflow as completed
    if (approval) {
      // No more APPROVER steps, check if there are SIGNER steps
      await prisma.workflow_instances.updateMany({
        where: { id: approval.workflow_instance_id, status: { in: ['in_progress', 'completed'] } },
        data: { status: 'completed', completed_at: new Date(), current_step_id: null },
      });

      // Get document with type info
      const document = await prisma.documents.findUnique({
        where: { id: approval.document_id },
        include: {
          document_type: true,
          sign_request: true,
          owner: true,
        },
      });

      if (document?.sign_request_id) {
        const { documentWorkflowOrchestratorService } = await import('../documents/documentWorkflowOrchestrator.service');
        const activation = await documentWorkflowOrchestratorService.activateSigningPhase(
          document.sign_request_id,
          tenantId
        );

        if (!activation.completedWithoutSigners) {
          await signRequestsService.dispatchPendingSigners(
            document.sign_request_id,
            tenantId,
            document.owner_id || userId,
            false
          );
        }
      } else {
        // No signing required, mark as completed
        await workflowStateService.transitionDocument(prisma, {
          documentId: approval.document_id,
          status: 'completed',
        });

        if (document?.sign_request_id) {
          await prisma.sign_requests.update({
            where: { id: document.sign_request_id },
            data: { status: 'completed' },
          });
        }
      }

      // Send completion notification to document owner
      const approver = await prisma.users.findUnique({
        where: { id: userId },
        select: { full_name: true, email: true },
      });

      if (document?.owner) {
        const documentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${document.id}`;
        
        // Send email notification
        emailService.sendWorkflowCompletedNotification({
          recipientEmail: document.owner.email,
          recipientName: document.owner.full_name || document.owner.email,
          documentTitle: document.title || 'Untitled',
          documentNumber: document.document_number || '',
          workflowName: instance.workflow.name,
          documentUrl,
        }).catch(err => console.error('Failed to send completion email:', err));

        // Create in-app notification
        notificationsService.createNotification({
          tenantId,
          userId: document.owner.id,
          type: NotificationType.WORKFLOW_COMPLETED,
          title: 'Quy trình phê duyệt hoàn tất',
          message: `Tài liệu "${document.title || 'Untitled'}" đã được phê duyệt hoàn tất`,
          link: `/documents/${document.id}`,
        }).catch(err => console.error('Failed to create notification:', err));

        // Also notify approver
        if (approver) {
          emailService.sendApprovalActionNotification({
            recipientEmail: approver.email,
            recipientName: approver.full_name || approver.email,
            documentTitle: document.title || 'Untitled',
            documentNumber: document.document_number || '',
            approverName: approver.full_name || approver.email,
            action: 'approved',
            comment,
            documentUrl,
          }).catch(err => console.error('Failed to send action email:', err));
        }
      }

      return {
        message: 'Document approved! Workflow completed.',
        status: 'completed',
      };
    }
  }

  /**
   * Reject a document
   * Ends workflow and sets document status to rejected
   */
  async reject(
    approvalId: number,
    userId: number,
    tenantId: number,
    comment?: string
  ) {
    // Get approval record
    const approval = await approvalsRepository.findApprovalById(approvalId);

    if (!approval) {
      throw ApiError.notFound('Approval not found', 'APPROVAL_NOT_FOUND');
    }

    // Verify approver
    if (approval.approver_user_id !== userId) {
      throw ApiError.forbidden('You are not the approver', 'NOT_APPROVER');
    }

    // Verify tenant
    if (approval.document.tenant_id !== tenantId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }

    // Check if already acted
    if (approval.action !== 'pending') {
      throw ApiError.badRequest(
        `Approval already ${approval.action}`,
        'APPROVAL_ALREADY_ACTED'
      );
    }

    const approvalMode = normalizeWorkflowApprovalMode(approval.workflow.approval_mode);
    const activeRun = await prisma.workflow_instances.findFirst({
      where: { id: approval.workflow_instance_id, document_id: approval.document_id, status: 'in_progress' },
      select: { current_step_id: true },
    });
    if (!activeRun || !isApprovalActionableInRun({
      mode: approvalMode,
      approvalAction: approval.action,
      workflowRunStatus: 'in_progress',
      currentStepId: activeRun.current_step_id,
      approvalStepId: approval.workflow_step_id,
      documentStatus: approval.document.status,
    })) {
      throw ApiError.conflict('Approval is not in the active workflow run', 'APPROVAL_RUN_NOT_ACTIVE');
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.document_approvals.updateMany({
        where: {
          id: approvalId,
          approver_user_id: userId,
          action: 'pending',
          workflow_instance_id: approval.workflow_instance_id,
          workflow_instance: {
            status: 'in_progress',
            ...(approvalMode === 'sequential'
              ? { current_step_id: approval.workflow_step_id }
              : {}),
          },
          document: {
            tenant_id: tenantId,
            status: 'pending_approval',
            ...(approval.document.sign_request_id
              ? { sign_request: { is: { status: { notIn: ['cancelled', 'archived', 'completed', 'rejected'] } } } }
              : {}),
          },
        },
        data: { action: 'rejected', comment, acted_at: new Date() },
      });
      if (updated.count !== 1) {
        throw ApiError.conflict('Approval was already processed', 'CONCURRENT_MODIFICATION');
      }
      const rejectedRun = await tx.workflow_instances.updateMany({
        where: { id: approval.workflow_instance_id, status: 'in_progress' },
        data: { status: 'rejected', completed_at: new Date() },
      });
      if (rejectedRun.count !== 1) {
        throw ApiError.conflict('Workflow run is no longer active', 'APPROVAL_RUN_NOT_ACTIVE');
      }
      if (approval.document.sign_request_id) {
        await workflowStateService.transitionSigningPair(tx, {
          documentId: approval.document_id,
          signRequestId: approval.document.sign_request_id,
          documentStatus: 'rejected',
          signRequestStatus: 'rejected',
        });
      } else {
        await workflowStateService.transitionDocument(tx, {
          documentId: approval.document_id,
          status: 'rejected',
        });
      }
      await tx.outbox_events.create({
        data: {
          tenant_id: tenantId,
          aggregate_type: "document",
          aggregate_id: String(approval.document_id),
          event_type: "DOCUMENT_REJECTED",
          payload: { document_id: approval.document_id, approval_id: approvalId },
          deduplication_key: `document-rejected:${approval.document_id}`,
        },
      });
    });

    // Send rejection notification to document owner
    const document = await prisma.documents.findUnique({
      where: { id: approval.document_id },
      include: { owner: true },
    });

    const approver = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true },
    });

    if (document?.owner && approver) {
      const documentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${document.id}`;
      
      // Send email notification
      emailService.sendApprovalActionNotification({
        recipientEmail: document.owner.email,
        recipientName: document.owner.full_name || document.owner.email,
        documentTitle: document.title || 'Untitled',
        documentNumber: document.document_number || '',
        approverName: approver.full_name || approver.email,
        action: 'rejected',
        comment,
        documentUrl,
      }).catch(err => console.error('Failed to send rejection email:', err));

      // Create in-app notification
      notificationsService.createNotification({
        tenantId,
        userId: document.owner.id,
        type: NotificationType.APPROVAL_REJECTED,
        title: 'Tài liệu bị từ chối',
        message: `Tài liệu "${document.title || 'Untitled'}" đã bị từ chối bởi ${approver.full_name || approver.email}`,
        link: `/documents/${document.id}/flow`,
      }).catch(err => console.error('Failed to create notification:', err));
    }

    return {
      message: 'Document rejected. Workflow ended.',
      status: 'rejected',
    };
  }

  /**
   * Request more information
   * Pauses workflow and notifies document owner
   */
  async requestMoreInfo(
    approvalId: number,
    userId: number,
    tenantId: number,
    comment: string
  ) {
    if (!comment || comment.trim().length === 0) {
      throw ApiError.badRequest('Comment is required', 'COMMENT_REQUIRED');
    }

    // Get approval record
    const approval = await approvalsRepository.findApprovalById(approvalId);

    if (!approval) {
      throw ApiError.notFound('Approval not found', 'APPROVAL_NOT_FOUND');
    }

    // Verify approver
    if (approval.approver_user_id !== userId) {
      throw ApiError.forbidden('You are not the approver', 'NOT_APPROVER');
    }

    // Verify tenant
    if (approval.document.tenant_id !== tenantId) {
      throw ApiError.forbidden('Access denied', 'ACCESS_DENIED');
    }

    // Check if already acted
    if (approval.action !== 'pending') {
      throw ApiError.badRequest(
        `Approval already ${approval.action}`,
        'APPROVAL_ALREADY_ACTED'
      );
    }

    // Update approval record
    await approvalsRepository.updateApproval(approvalId, {
      action: 'request_info',
      comment,
      acted_at: new Date(),
    });

    // Send notification to document owner
    const document = await prisma.documents.findUnique({
      where: { id: approval.document_id },
      include: { owner: true },
    });

    const approver = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true },
    });

    if (document?.owner && approver) {
      const documentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${document.id}`;
      
      // Send email notification
      emailService.sendApprovalActionNotification({
        recipientEmail: document.owner.email,
        recipientName: document.owner.full_name || document.owner.email,
        documentTitle: document.title || 'Untitled',
        documentNumber: document.document_number || '',
        approverName: approver.full_name || approver.email,
        action: 'request_info',
        comment,
        documentUrl,
      }).catch(err => console.error('Failed to send request info email:', err));

      // Create in-app notification
      notificationsService.createNotification({
        tenantId,
        userId: document.owner.id,
        type: NotificationType.APPROVAL_INFO_REQUESTED,
        title: 'Yêu cầu bổ sung thông tin',
        message: `${approver.full_name || approver.email} yêu cầu bổ sung thông tin cho tài liệu "${document.title || 'Untitled'}"`,
        link: `/documents/${document.id}/flow`,
      }).catch(err => console.error('Failed to create notification:', err));
    }

    return {
      message: 'Information requested. Document owner will be notified.',
      status: 'request_info',
    };
  }

  /**
   * Get my pending approvals with filters, pagination, search, sort
   */
  async getMyPendingApprovals(
    userId: number,
    tenantId: number,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      documentTypeId?: number;
      creatorSearch?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause - simplified to avoid nested complexity
    const where: Prisma.document_approvalsWhereInput = {
      approver_user_id: userId,
      action: 'pending',
      workflow_instance: { status: 'in_progress' },
      document: { tenant_id: tenantId, status: 'pending_approval' },
    };

    // For complex filters, we'll filter in memory after fetching
    // This is simpler and avoids Prisma nested where issues

    // Get all approvals for this user (we'll filter in memory)
    let allApprovals = await prisma.document_approvals.findMany({
      where,
      include: {
        document: {
          include: {
            owner: { select: { id: true, email: true, full_name: true } },
            document_type: { select: { id: true, name: true, code: true } }
          }
        },
        workflow: { select: { id: true, name: true } },
        workflow_step: { select: { id: true, step_order: true, step_name: true } },
        approver: { select: { id: true, email: true, full_name: true } }
      }
    });

    // Filter by document type
    if (options?.documentTypeId) {
      allApprovals = allApprovals.filter(a => 
        a.document.document_type_id === options.documentTypeId
      );
    }

    // Filter by creator (search by name or email)
    if (options?.creatorSearch) {
      const creatorLower = options.creatorSearch.toLowerCase();
      allApprovals = allApprovals.filter(a => {
        const owner = a.document.owner;
        return (
          owner.full_name?.toLowerCase().includes(creatorLower) ||
          owner.email?.toLowerCase().includes(creatorLower)
        );
      });
    }

    // Search filter (document title, number)
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      allApprovals = allApprovals.filter(a => {
        const doc = a.document;
        return (
          doc.title?.toLowerCase().includes(searchLower) ||
          doc.document_number?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort
    allApprovals.sort((a, b) => {
      if (options?.sortBy === 'document_number') {
        const aNum = a.document.document_number || '';
        const bNum = b.document.document_number || '';
        return options.sortOrder === 'asc' ? aNum.localeCompare(bNum) : bNum.localeCompare(aNum);
      } else {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return options?.sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
    });

    // Pagination
    const total = allApprovals.length;
    const approvals = allApprovals.slice(skip, skip + limit);

    // Calculate statistics from filtered approvals
    const allApprovalsForUser = await prisma.document_approvals.findMany({
      where: {
        approver_user_id: userId,
        action: 'pending',
        workflow_instance: { status: 'in_progress' },
        document: { tenant_id: tenantId, status: 'pending_approval' },
      },
      select: { action: true },
    });
    
    const statistics = {
      total: allApprovalsForUser.length,
      pending: allApprovalsForUser.filter(a => a.action === 'pending').length,
      approved: allApprovalsForUser.filter(a => a.action === 'approved').length,
      rejected: allApprovalsForUser.filter(a => a.action === 'rejected').length,
      info_requested: allApprovalsForUser.filter(a => a.action === 'info_requested').length
    };

    return {
      approvals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statistics
    };
  }

  /**
   * Get document approval history
   */
  async getDocumentApprovals(documentId: number, tenantId: number, userId: number) {
    // Verify document belongs to tenant
    const document = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });

    if (!document) {
      throw ApiError.notFound('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    const access = await authorizationService.canAccessDocument(userId, tenantId, documentId, 'read');
    if (!access.allowed) {
      throw ApiError.forbidden('You are not authorized to view this document approval history', 'DOCUMENT_ACCESS_DENIED');
    }

    return approvalsRepository.findDocumentApprovals(documentId);
  }

  /**
   * Get workflow instance for document
   */
  async getWorkflowInstance(documentId: number, tenantId: number, userId: number) {
    // Verify document belongs to tenant
    const document = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });

    if (!document) {
      throw ApiError.notFound('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    const access = await authorizationService.canAccessDocument(userId, tenantId, documentId, 'read');
    if (!access.allowed) {
      throw ApiError.forbidden('You are not authorized to view this workflow instance', 'DOCUMENT_ACCESS_DENIED');
    }

    return approvalsRepository.findWorkflowInstance(documentId);
  }

  /**
   * Get my combined tasks (approvals + signing)
   */
  async getMyCombinedTasks(
    userId: number,
    tenantId: number,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      taskType?: string; // 'approval' | 'signing' | undefined (all)
      status?: string;
      documentTypeId?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;
    const currentUser = await prisma.users.findFirst({
      where: { id: userId, tenant_id: tenantId },
      select: { email: true },
    });

    let allTasks: CombinedTask[] = [];

    // Get approvals if taskType is 'approval' or undefined (all)
    if (!options?.taskType || options.taskType === 'approval') {
      const approvals = await prisma.document_approvals.findMany({
        where: {
          approver_user_id: userId,
          action: 'pending',
          workflow_instance: { status: 'in_progress' },
          document: { tenant_id: tenantId, status: 'pending_approval' },
        },
        include: {
          document: {
            include: {
              owner: { select: { id: true, email: true, full_name: true } },
              document_type: { select: { id: true, name: true, code: true } }
            }
          },
          workflow_step: { select: { step_name: true, step_order: true } }
        }
      });

      // Map to unified task format
      approvals.forEach(approval => {
        allTasks.push({
          task_type: 'approval',
          task_id: approval.id,
          document_id: approval.document_id,
          document_number: approval.document.document_number,
          document_title: approval.document.title,
          document_type: approval.document.document_type,
          owner: approval.document.owner,
          status: approval.action, // pending, approved, rejected, info_requested
          workflow_step: approval.workflow_step?.step_name,
          created_at: approval.created_at,
          due_date: approval.due_date,
          next_action: approval.action === 'pending' ? 'REVIEW_APPROVAL' : 'VIEW_STATUS',
        });
      });
    }

    // Get signing tasks if taskType is 'signing' or undefined (all)
    if (!options?.taskType || options.taskType === 'signing') {
      // Get all sign requests with signers
      // ✅ Only get signers that are ready to sign (pending, otp_sent)
      // ❌ Exclude waiting_signing (waiting for their turn)
      const signRequests = await prisma.sign_requests.findMany({
        where: { tenant_id: tenantId },
        include: {
          signers: {
            where: {
              is_internal: true,
              OR: [
                { user_id: userId },
                ...(currentUser?.email ? [{ email: currentUser.email }] : []),
              ],
              status: {
                in: ['pending', 'otp_sent', 'signed', 'rejected'] // Exclude waiting_signing, waiting_approval
              }
            }
          },
          document: {
            include: {
              owner: { select: { id: true, email: true, full_name: true } },
              document_type: { select: { id: true, name: true, code: true } }
            }
          }
        }
      });

      // Filter by tenant and map to tasks
      signRequests.forEach((signRequest) => {
        if (signRequest.signers.length > 0) {
          signRequest.signers.forEach((signer) => {
            allTasks.push({
              task_type: 'signing',
              task_id: signer.id,
              sign_request_id: signRequest.id,
              document_id: signRequest.document_id,
              document_number: signRequest.document.document_number,
              document_title: signRequest.document.title,
              document_type: signRequest.document.document_type,
              owner: signRequest.document.owner,
              status: signer.status, // pending, otp_sent, signed, rejected
              signing_order: signer.signing_order,
              created_at: signRequest.created_at,
              due_date: null, // Signers don't have due dates
              next_action: ['pending', 'otp_sent'].includes(signer.status || '') ? 'SIGN_NOW' : 'VIEW_STATUS',
            });
          });
        }
      });
    }

    // Apply filters
    if (options?.documentTypeId) {
      allTasks = allTasks.filter(t => t.document_type?.id === options.documentTypeId);
    }

    if (options?.status) {
      allTasks = allTasks.filter(t => t.status === options.status);
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      allTasks = allTasks.filter(t =>
        t.document_title?.toLowerCase().includes(searchLower) ||
        t.document_number?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    allTasks.sort((a, b) => {
      if (options?.sortBy === 'document_number') {
        const aNum = a.document_number || '';
        const bNum = b.document_number || '';
        return options.sortOrder === 'asc' ? aNum.localeCompare(bNum) : bNum.localeCompare(aNum);
      } else {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return options?.sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
    });

    // Pagination
    const total = allTasks.length;
    const tasks = allTasks.slice(skip, skip + limit);

    // Calculate statistics
    const statistics = {
      total: allTasks.length,
      approval_pending: allTasks.filter(t => t.task_type === 'approval' && t.status === 'pending').length,
      signing_pending: allTasks.filter(t => t.task_type === 'signing' && (t.status === 'pending' || t.status === 'otp_sent')).length,
      completed: allTasks.filter(t => 
        (t.task_type === 'approval' && t.status === 'approved') ||
        (t.task_type === 'signing' && t.status === 'signed')
      ).length,
    };

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statistics
    };
  }

  /**
   * Auto-send sign request after approval completes
   * ✅ Activates signers (waiting_approval → pending) and sends emails
   */
  private async autoSendSignRequest(
    document: Pick<documents, 'id' | 'sign_request_id' | 'owner_id'>,
    tenantId: number,
  ) {
    const { signRequestsService } = await import('../signRequests/signRequests.service');
    const { signersRepository } = await import('../signers/signers.repository');
    
    try {
      console.log(`[Auto-Send] Activating signers for sign request ${document.sign_request_id}`);
      
      // ✅ STEP 1: Activate signers (update status from 'waiting_approval' to 'pending')
      const signers = await signersRepository.findBySignRequest(document.sign_request_id);
      const waitingSigners = signers.filter(s => s.status === 'waiting_approval');
      
      console.log(`[Auto-Send] Found ${waitingSigners.length} signers waiting for approval`);
      
      for (const signer of waitingSigners) {
        await signersRepository.update(signer.id, {
          status: 'pending'
        });
        console.log(`[Auto-Send] Activated signer: ${signer.email}`);
      }
      
      // ✅ STEP 2: Send sign request (generates tokens & sends emails)
      await signRequestsService.sendSignRequest(
        document.sign_request_id,
        tenantId,
        document.owner_id || 0 // Use document owner as sender
      );
      
      // Update document status
      await prisma.documents.update({
        where: { id: document.id },
        data: { status: 'pending_signature' },
      });
      
      console.log(`[Auto-Send] ✓ Sign request ${document.sign_request_id} sent for document ${document.id}`);
    } catch (error) {
      console.error('[Auto-Send] ✗ Failed to auto-send sign request:', error);
      // Don't fail the approval, just log the error
      // Document stays in 'approved' status
      await prisma.documents.update({
        where: { id: document.id },
        data: { status: 'approved' },
      });
    }
  }
}

export const approvalsService = new ApprovalsService();

