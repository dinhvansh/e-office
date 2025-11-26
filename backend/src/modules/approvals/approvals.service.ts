import { ApiError } from '../../core/errors/api-error';
import { approvalsRepository } from './approvals.repository';
import { prisma } from '../../config/prisma';
import { emailService } from '../common/email.service';
import { signRequestsService } from '../signRequests/signRequests.service';

class ApprovalsService {
  /**
   * List all approvals for a tenant
   */
  async listApprovals(tenantId: number) {
    return await prisma.document_approvals.findMany({
      where: { tenant_id: tenantId },
      include: {
        document: {
          select: { id: true, title: true, status: true }
        },
        workflow_step: {
          select: { step_name: true, step_order: true }
        },
        approver_user: {
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

    return approval;
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

    // Get first step
    const firstStep = workflow.steps[0];

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

    // Update approval record
    await approvalsRepository.updateApproval(approvalId, {
      action: 'approved',
      comment,
      signature_data: signatureData,
      signature_type: signatureType,
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
      tenantId,
      approval.document_id // Pass documentId for manager lookup
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
    const where: any = {
      approver_user_id: userId
    };

    // Filter by status
    if (options?.status) {
      where.action = options.status;
    }

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

    // Filter by tenant
    allApprovals = allApprovals.filter(a => a.document.tenant_id === tenantId);

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
      where: { approver_user_id: userId },
      include: { document: { select: { tenant_id: true } } }
    });
    
    const tenantApprovals = allApprovalsForUser.filter(a => a.document.tenant_id === tenantId);
    
    const statistics = {
      total: tenantApprovals.length,
      pending: tenantApprovals.filter(a => a.action === 'pending').length,
      approved: tenantApprovals.filter(a => a.action === 'approved').length,
      rejected: tenantApprovals.filter(a => a.action === 'rejected').length,
      info_requested: tenantApprovals.filter(a => a.action === 'info_requested').length
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

    let allTasks: any[] = [];

    // Get approvals if taskType is 'approval' or undefined (all)
    if (!options?.taskType || options.taskType === 'approval') {
      const approvals = await prisma.document_approvals.findMany({
        where: { approver_user_id: userId },
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

      // Filter by tenant
      const tenantApprovals = approvals.filter(a => a.document.tenant_id === tenantId);

      // Map to unified task format
      tenantApprovals.forEach(approval => {
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
        });
      });
    }

    // Get signing tasks if taskType is 'signing' or undefined (all)
    if (!options?.taskType || options.taskType === 'signing') {
      // Get all sign requests with signers
      const signRequests: any = await prisma.sign_requests.findMany({
        include: {
          signers: {
            where: {
              user_id: userId,
              is_internal: true,
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
      signRequests.forEach((signRequest: any) => {
        if (signRequest.document.tenant_id === tenantId && signRequest.signers.length > 0) {
          signRequest.signers.forEach((signer: any) => {
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

