import { ApiError } from '../../core/errors/api-error';
import { approvalsRepository } from './approvals.repository';
import { prisma } from '../../config/prisma';
import { emailService } from '../common/email.service';

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

    // Send email notifications to approvers
    const submitter = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true },
    });

    const approvers = await prisma.users.findMany({
      where: { id: { in: approverIds } },
      select: { id: true, email: true, full_name: true },
    });

    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/approvals`;

    // Send emails in parallel (don't wait)
    Promise.all(
      approvers.map(approver =>
        emailService.sendApprovalRequestNotification({
          recipientEmail: approver.email,
          recipientName: approver.full_name || approver.email,
          documentTitle: document.title || 'Untitled',
          documentNumber: document.document_number || '',
          submitterName: submitter?.full_name || submitter?.email || 'Unknown',
          workflowName: workflow.name,
          stepName: firstStep.step_name || `Bước ${firstStep.step_order}`,
          dueDate,
          approvalUrl,
        }).catch(err => console.error(`Failed to send email to ${approver.email}:`, err))
      )
    ).catch(err => console.error('Email notification errors:', err));

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
        current_step_id: undefined,
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

      // Check if document requires digital signing
      if (document?.document_type?.require_digital_signing && document.sign_request_id) {
        // Auto-send sign request
        await this.autoSendSignRequest(document, tenantId);
      } else {
        // No signing required, mark as completed
        await prisma.documents.update({
          where: { id: approval.document_id },
          data: { status: 'completed' },
        });
      }

      // Send completion notification to document owner
      const approver = await prisma.users.findUnique({
        where: { id: userId },
        select: { full_name: true, email: true },
      });

      if (document?.owner) {
        const documentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${document.id}`;
        
        emailService.sendWorkflowCompletedNotification({
          recipientEmail: document.owner.email,
          recipientName: document.owner.full_name || document.owner.email,
          documentTitle: document.title || 'Untitled',
          documentNumber: document.document_number || '',
          workflowName: instance.workflow.name,
          documentUrl,
        }).catch(err => console.error('Failed to send completion email:', err));

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

    // Send notifications to next approvers
    const document = await prisma.documents.findUnique({
      where: { id: approval.document_id },
      include: { owner: true },
    });

    const approver = await prisma.users.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true },
    });

    const nextApprovers = await prisma.users.findMany({
      where: { id: { in: nextApproverIds } },
      select: { id: true, email: true, full_name: true },
    });

    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/approvals`;
    const documentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${approval.document_id}`;

    // Notify next approvers
    Promise.all(
      nextApprovers.map(nextApprover =>
        emailService.sendApprovalRequestNotification({
          recipientEmail: nextApprover.email,
          recipientName: nextApprover.full_name || nextApprover.email,
          documentTitle: document?.title || 'Document',
          documentNumber: document?.document_number || '',
          submitterName: document?.owner?.full_name || document?.owner?.email || 'Unknown',
          workflowName: instance.workflow.name,
          stepName: nextStep.step_name || `Bước ${nextStep.step_order}`,
          dueDate,
          approvalUrl,
        }).catch(err => console.error(`Failed to send email to ${nextApprover.email}:`, err))
      )
    ).catch(err => console.error('Email notification errors:', err));

    // Notify document owner about progress
    if (document?.owner && approver) {
      emailService.sendApprovalActionNotification({
        recipientEmail: document.owner.email,
        recipientName: document.owner.full_name || document.owner.email,
        documentTitle: document.title || 'Untitled',
        documentNumber: document.document_number || '',
        approverName: approver.full_name || approver.email,
        action: 'approved',
        comment,
        documentUrl,
      }).catch(err => console.error('Failed to send progress email:', err));
    }

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
    }

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

  /**
   * Auto-send sign request after approval completes
   */
  private async autoSendSignRequest(document: any, tenantId: number) {
    const { signRequestsService } = await import('../signRequests/signRequests.service');
    
    try {
      // Send sign request (generates tokens & sends emails)
      await signRequestsService.sendSignRequest(
        document.sign_request_id,
        tenantId,
        0 // System auto-send
      );
      
      // Update document status
      await prisma.documents.update({
        where: { id: document.id },
        data: { status: 'pending_signature' },
      });
      
      console.log(`Auto-sent sign request ${document.sign_request_id} for document ${document.id}`);
    } catch (error) {
      console.error('Failed to auto-send sign request:', error);
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

