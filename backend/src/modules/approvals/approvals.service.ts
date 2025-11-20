import { ApiError } from '../../core/errors/api-error';
import { approvalsRepository } from './approvals.repository';
import { prisma } from '../../config/prisma';

class ApprovalsService {
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

    // Get first step
    const firstStep = workflow.steps[0];

    // Get approvers for first step
    const approverIds = await approvalsRepository.getApproversForStep(
      firstStep.id,
      tenantId
    );

    if (approverIds.length === 0) {
      throw ApiError.badRequest(
        'No approvers found for first step',
        'NO_APPROVERS_FOUND'
      );
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + firstStep.due_in_days);

    // Create workflow instance
    const instance = await approvalsRepository.createWorkflowInstance({
      document_id: documentId,
      workflow_id: workflowId,
      current_step_id: firstStep.id,
      status: 'in_progress',
    });

    // Create approval records for all approvers in first step
    const approvals = approverIds.map(approverId => ({
      document_id: documentId,
      workflow_id: workflowId,
      workflow_step_id: firstStep.id,
      approver_user_id: approverId,
      due_date: dueDate,
    }));

    await approvalsRepository.createApprovals(approvals);

    // Update document status
    await prisma.documents.update({
      where: { id: documentId },
      data: { status: 'pending_approval' },
    });

    // TODO: Send email notifications to approvers

    return {
      instance,
      approvals: approvals.length,
      message: `Document submitted for approval. ${approvals.length} approver(s) notified.`,
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

    // Update approval record
    await approvalsRepository.updateApproval(approvalId, {
      action: 'approved',
      comment,
      acted_at: new Date(),
    });

    // Check if all approvals for this step are done
    const stepApprovals = await approvalsRepository.findStepApprovals(
      approval.document_id,
      approval.workflow_step_id
    );

    const allApproved = stepApprovals.every(
      a => a.id === approvalId || a.action === 'approved'
    );

    if (!allApproved) {
      // Still waiting for other approvers in this step
      return {
        message: 'Approval recorded. Waiting for other approvers.',
        status: 'waiting',
      };
    }

    // All approvals for this step are done, move to next step
    const instance = await approvalsRepository.findWorkflowInstance(approval.document_id);

    if (!instance) {
      throw ApiError.notFound('Workflow instance not found', 'INSTANCE_NOT_FOUND');
    }

    const currentStepOrder = instance.current_step?.step_order || 0;
    const nextStep = instance.workflow.steps.find(
      s => s.step_order === currentStepOrder + 1
    );

    if (!nextStep) {
      // No more steps, workflow complete
      await approvalsRepository.updateWorkflowInstance(approval.document_id, {
        status: 'completed',
        completed_at: new Date(),
        current_step_id: null,
      });

      await prisma.documents.update({
        where: { id: approval.document_id },
        data: { status: 'approved' },
      });

      // TODO: Send completion notification

      return {
        message: 'Document approved! Workflow completed.',
        status: 'completed',
      };
    }

    // Move to next step
    const nextApproverIds = await approvalsRepository.getApproversForStep(
      nextStep.id,
      tenantId
    );

    if (nextApproverIds.length === 0) {
      throw ApiError.badRequest(
        'No approvers found for next step',
        'NO_APPROVERS_FOUND'
      );
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + nextStep.due_in_days);

    // Create approvals for next step
    const nextApprovals = nextApproverIds.map(approverId => ({
      document_id: approval.document_id,
      workflow_id: approval.workflow_id,
      workflow_step_id: nextStep.id,
      approver_user_id: approverId,
      due_date: dueDate,
    }));

    await approvalsRepository.createApprovals(nextApprovals);

    // Update workflow instance
    await approvalsRepository.updateWorkflowInstance(approval.document_id, {
      current_step_id: nextStep.id,
    });

    // TODO: Send notifications to next approvers

    return {
      message: `Approved! Moved to next step: ${nextStep.step_name}`,
      status: 'next_step',
      next_step: nextStep.step_name,
    };
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

    // Update approval record
    await approvalsRepository.updateApproval(approvalId, {
      action: 'rejected',
      comment,
      acted_at: new Date(),
    });

    // Update workflow instance
    await approvalsRepository.updateWorkflowInstance(approval.document_id, {
      status: 'rejected',
      completed_at: new Date(),
    });

    // Update document status
    await prisma.documents.update({
      where: { id: approval.document_id },
      data: { status: 'rejected' },
    });

    // TODO: Send rejection notification to document owner

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

    // TODO: Send notification to document owner

    return {
      message: 'Information requested. Document owner will be notified.',
      status: 'request_info',
    };
  }

  /**
   * Get my pending approvals
   */
  async getMyPendingApprovals(userId: number, tenantId: number) {
    return approvalsRepository.findPendingApprovals(userId, tenantId);
  }

  /**
   * Get document approval history
   */
  async getDocumentApprovals(documentId: number, tenantId: number) {
    // Verify document belongs to tenant
    const document = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });

    if (!document) {
      throw ApiError.notFound('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    return approvalsRepository.findDocumentApprovals(documentId);
  }

  /**
   * Get workflow instance for document
   */
  async getWorkflowInstance(documentId: number, tenantId: number) {
    // Verify document belongs to tenant
    const document = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });

    if (!document) {
      throw ApiError.notFound('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    return approvalsRepository.findWorkflowInstance(documentId);
  }
}

export const approvalsService = new ApprovalsService();
