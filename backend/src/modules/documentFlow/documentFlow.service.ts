import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FlowStep {
  id: string;
  type: 'approval' | 'signing';
  order: number;
  sign_request_id?: number;
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'signed' | 'info_requested';
  started_at?: string;
  completed_at?: string;
  comment?: string;
  signer_kind?: 'internal' | 'external';
}

interface FlowActivity {
  timestamp: string;
  actor: string;
  action: string;
  details?: string;
}

interface FlowPhase {
  key: 'approval' | 'signing';
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
}

export class DocumentFlowService {
  /**
   * Get unified flow data for a document
   * Combines workflow approval steps and signing steps
   */
  async getDocumentFlow(documentId: number, tenantId: number, userId: number) {
    const currentUser = await prisma.users.findFirst({
      where: {
        id: userId,
        tenant_id: tenantId,
      },
      select: {
        email: true,
      },
    });

    // 1. Get document with all relations
    const document = await prisma.documents.findFirst({
      where: {
        id: documentId,
        tenant_id: tenantId,
      },
      include: {
        document_type: true,
        owner: {
          select: {
            id: true,
            email: true,
            full_name: true,
          },
        },
        workflow_instance: {
          include: {
            workflow: true,
          },
        },
        approvals: {
          include: {
            workflow_step: true,
            approver: {
              select: {
                id: true,
                email: true,
                full_name: true,
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
        sign_request: {
          include: {
            signers: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    full_name: true,
                  },
                },
              },
              orderBy: {
                signing_order: 'asc',
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // 2. Build phases
    const phases: FlowPhase[] = [];
    
    // Approval phase
    if (document.workflow_instance && document.approvals) {
      const approvals = document.approvals;
      let approvalStatus: FlowPhase['status'] = 'pending';
      
      if (approvals.some(a => a.action === 'rejected')) {
        approvalStatus = 'rejected';
      } else if (approvals.every(a => a.action === 'approved')) {
        approvalStatus = 'completed';
      } else if (approvals.some(a => a.action === 'approved')) {
        approvalStatus = 'in_progress';
      }
      
      phases.push({
        key: 'approval',
        label: 'Phê duyệt',
        status: approvalStatus,
      });
    }
    
    // Signing phase
    if (document.sign_request) {
      const signers = document.sign_request.signers;
      let signingStatus: FlowPhase['status'] = 'pending';
      
      if (signers.some(s => s.status === 'rejected')) {
        signingStatus = 'rejected';
      } else if (signers.every(s => s.status === 'signed' || s.status === 'completed')) {
        signingStatus = 'completed';
      } else if (signers.some(s => s.status === 'signed' || s.status === 'completed')) {
        signingStatus = 'in_progress';
      }
      
      phases.push({
        key: 'signing',
        label: 'Ký số',
        status: signingStatus,
      });
    }

    // 3. Build steps array
    const steps: FlowStep[] = [];
    let orderCounter = 1;

    // Add approval steps
    if (document.workflow_instance && document.approvals) {
      for (const approval of document.approvals) {
        steps.push({
          id: `approval-${approval.id}`,
          type: 'approval',
          order: orderCounter++,
          user: approval.approver ? {
            id: approval.approver.id,
            name: approval.approver.full_name || approval.approver.email,
            email: approval.approver.email,
          } : null,
          status: this.mapApprovalStatus(approval.action),
          started_at: approval.created_at?.toISOString(),
          completed_at: approval.acted_at?.toISOString(),
          comment: approval.comment || undefined,
        });
      }
    }

    // Add signing steps
    if (document.sign_request) {
      for (const signer of document.sign_request.signers) {
        steps.push({
          id: `signing-${signer.id}`,
          type: 'signing',
          order: orderCounter++,
          sign_request_id: document.sign_request.id,
          user: signer.user ? {
            id: signer.user.id,
            name: signer.user.full_name || signer.user.email,
            email: signer.user.email,
          } : {
            id: 0,
            name: signer.name || signer.email,
            email: signer.email,
          },
          status: this.mapSignerStatus(signer.status),
          started_at: undefined, // Signers don't have created_at field
          completed_at: signer.signed_at?.toISOString(),
          signer_kind: signer.is_internal ? 'internal' : 'external',
        });
      }
    }

    // 4. Build activities timeline
    const activities: FlowActivity[] = [];

    // Document created
    activities.push({
      timestamp: document.created_at.toISOString(),
      actor: document.owner.full_name || document.owner.email,
      action: 'Tạo tài liệu',
      details: document.title,
    });

    // Approval activities
    if (document.workflow_instance && document.approvals) {
      for (const approval of document.approvals) {
        if (approval.acted_at) {
          const actionText = this.getApprovalActionText(approval.action);
          activities.push({
            timestamp: approval.acted_at.toISOString(),
            actor: approval.approver?.full_name || approval.approver?.email || 'Hệ thống',
            action: actionText,
            details: approval.comment || undefined,
          });
        }
      }
    }

    // Signing activities
    if (document.sign_request) {
      // Sign request sent
      if (document.sign_request.status !== 'draft') {
        activities.push({
          timestamp: document.sign_request.created_at.toISOString(),
          actor: 'Hệ thống',
          action: 'Gửi yêu cầu ký',
          details: `Gửi cho ${document.sign_request.signers.length} người ký`,
        });
      }

      // Signing activities
      for (const signer of document.sign_request.signers) {
        if (signer.signed_at) {
          activities.push({
            timestamp: signer.signed_at.toISOString(),
            actor: signer.name || signer.email,
            action: 'Đã ký tài liệu',
          });
        }
      }
    }

    // Sort activities by timestamp
    activities.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 5. Determine overall status
    return {
      document: {
        id: document.id,
        title: document.title,
        document_number: document.document_number,
        status: document.status,
        document_type: document.document_type?.name,
        created_at: document.created_at.toISOString(),
        signed_file_path: document.signed_file_path, // ✅ Include signed file path for progressive PDF
        owner: {
          id: document.owner.id,
          name: document.owner.full_name || document.owner.email,
          email: document.owner.email,
        },
      },
      phases,
      steps,
      activities,
      // User permissions for actions
      can_approve: this.canUserApprove(document, userId),
      can_sign: this.canUserSign(document, userId, currentUser?.email || null),
    };
  }

  private mapApprovalStatus(action: string | null): FlowStep['status'] {
    switch (action) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'info_requested':
        return 'info_requested';
      default:
        return 'pending';
    }
  }

  private mapSignerStatus(status: string): FlowStep['status'] {
    switch (status) {
      case 'signed':
      case 'completed':
        return 'signed';
      case 'rejected':
        return 'rejected';
      case 'otp_sent':
        return 'in_progress';
      default:
        return 'pending';
    }
  }

  private getApprovalActionText(action: string | null): string {
    switch (action) {
      case 'approved':
        return 'Phê duyệt';
      case 'rejected':
        return 'Từ chối';
      case 'info_requested':
        return 'Yêu cầu bổ sung';
      default:
        return 'Chờ phê duyệt';
    }
  }

  private canUserApprove(document: any, userId: number): boolean {
    if (!document.workflow_instance || !document.approvals) return false;
    
    // Check if user is pending approver
    const pendingApproval = document.approvals.find(
      (a: any) => a.approver_user_id === userId && a.action === 'pending'
    );
    
    return !!pendingApproval;
  }

  private canUserSign(document: any, userId: number, userEmail: string | null): boolean {
    if (!document.sign_request) return false;
    
    // Check if user is pending signer
    const pendingSigner = document.sign_request.signers.find(
      (s: any) =>
        s.status === 'pending' &&
        (s.user_id === userId || (!!userEmail && s.email?.toLowerCase() === userEmail.toLowerCase()))
    );
    
    return !!pendingSigner;
  }
}

export const documentFlowService = new DocumentFlowService();
