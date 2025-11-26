import { documents } from "@prisma/client";
import { promises as fs } from "fs";
import crypto from "crypto";
import { ApiError } from "../../core/errors/api-error";
import { saveBase64Document } from "../../core/utils/fileStorage";
import { auditService } from "../audit/audit.service";
import { licenseService } from "../licenses/license.service";
import { numberingService } from "../numbering/numbering.service";
import { prisma } from "../../config/prisma";
import { CreateDocumentData, documentsRepository } from "./documents.repository";
import { canViewDocument, filterViewableDocuments } from "./documents.access";

export interface CreateDocumentInput {
  fileName: string;
  base64?: string;
  storagePath?: string;
  documentTypeId?: number;
  departmentId?: number;
  title?: string;
  summary?: string;
  priorityLevel?: string;
  confidentialLevel?: string;
  visibilityScope?: string;
  workflowId?: number;
  signers?: Array<{
    email: string;
    name: string;
    order: number;
    type: 'manual' | 'external';
    external_org_id?: number;
  }>;
  ccEmails?: string[];
  attachments?: Array<{
    file_name: string;
    file_base64: string;
    file_type: string;
  }>;
}

class DocumentsService {
  async listDocuments(tenantId: number, userId?: number): Promise<documents[]> {
    const documents = await documentsRepository.listByTenant(tenantId);
    
    // If no userId provided (admin context), return all documents
    if (!userId) {
      return documents;
    }
    
    // Get user for permission check
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });
    
    if (!user || user.tenant_id !== tenantId) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }
    
    // Filter documents based on user permissions
    return await filterViewableDocuments(user, documents);
  }

  async listDocumentsPaginated(
    tenantId: number,
    userId: number | undefined,
    page: number = 1,
    limit: number = 10
  ) {
    const result = await documentsRepository.listByTenantPaginated(tenantId, { page, limit });
    
    // If no userId provided (admin context), return all documents
    if (!userId) {
      return result;
    }
    
    // Get user for permission check
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });
    
    if (!user || user.tenant_id !== tenantId) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }
    
    // Filter documents based on user permissions
    const filteredData = await filterViewableDocuments(user, result.data);
    
    return {
      data: filteredData,
      pagination: result.pagination,
    };
  }

  async getDocument(documentId: number, tenantId: number, userId?: number): Promise<documents> {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }
    
    // If no userId provided (admin context), return document
    if (!userId) {
      return document;
    }
    
    // Get user for permission check
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });
    
    if (!user || user.tenant_id !== tenantId) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }
    
    // Check if user can view this document
    const canView = await canViewDocument(user, document);
    if (!canView) {
      throw ApiError.forbidden("You do not have access to this document", "DOCUMENT_ACCESS_DENIED");
    }
    
    return document;
  }

  async createDocument(input: CreateDocumentInput & {
    adhocSteps?: Array<{ approver_user_id: number; due_in_days: number }>;
    customizedSteps?: Array<{
      step_name?: string;
      approver_type: string;
      approver_id: number;
      due_in_days: number;
    }>;
  }, tenantId: number, ownerId: number, requesterIp?: string, userAgent?: string) {
    if (!input.base64 && !input.storagePath) {
      throw ApiError.badRequest("Either base64 or storagePath must be provided", "DOCUMENT_PAYLOAD_REQUIRED");
    }
    await licenseService.enforceDocumentLimit(tenantId);
    let filePath: string;
    let hash: string;
    if (input.base64) {
      const buffer = Buffer.from(input.base64, "base64");
      hash = crypto.createHash("sha256").update(buffer).digest("hex");
      filePath = await saveBase64Document(tenantId, input.fileName, input.base64);
    } else {
      // Security: Validate storage_path to prevent Local File Read (LFR) attacks
      const path = require('path');
      const storagePath = input.storagePath!;
      
      // Check for path traversal attempts
      if (storagePath.includes('..') || storagePath.includes('~')) {
        throw ApiError.badRequest("Invalid storage path: path traversal detected", "INVALID_STORAGE_PATH");
      }
      
      // Ensure path is within STORAGE_BASE_PATH
      const { env } = await import('../../config/env');
      const resolvedPath = path.resolve(process.cwd(), storagePath);
      const allowedBasePath = path.resolve(process.cwd(), env.STORAGE_BASE_PATH);
      
      if (!resolvedPath.startsWith(allowedBasePath)) {
        throw ApiError.badRequest("Invalid storage path: must be within storage directory", "INVALID_STORAGE_PATH");
      }
      
      filePath = storagePath;
      const buffer = await fs.readFile(filePath);
      hash = crypto.createHash("sha256").update(buffer).digest("hex");
    }

    // Handle document type and numbering
    let documentTypeId: number | null = null;
    let documentNumber: string | null = null;
    let numberingRuleId: number | null = null;
    let documentType: any = null;

    if (input.documentTypeId) {
      // Load document type with workflow settings
      documentType = await prisma.document_types.findFirst({
        where: {
          id: input.documentTypeId,
          tenant_id: tenantId,
          is_active: true,
        },
        include: {
          default_workflow: true,
        },
      });

      if (!documentType) {
        throw ApiError.notFound("Document type not found", "DOCUMENT_TYPE_NOT_FOUND");
      }

      documentTypeId = documentType.id;

      // Generate document number if required
      if (documentType.require_numbering) {
        try {
          const result = await numberingService.generateNumberForDocument(tenantId, documentType.id);
          documentNumber = result.documentNumber;
          numberingRuleId = result.ruleId;
        } catch (error) {
          throw ApiError.badRequest(
            "Numbering rule not configured for this document type",
            "NUMBERING_RULE_NOT_CONFIGURED"
          );
        }
      }
    }

    // Determine initial status based on approval requirement
    const initialStatus = documentType?.require_approval ? "draft" : "active";

    const payload: CreateDocumentData = {
      tenant_id: tenantId,
      owner_id: ownerId,
      file_path: filePath,
      original_file_name: input.fileName,
      hash,
      status: initialStatus,
      document_type_id: documentTypeId,
      department_id: input.departmentId,
      document_number: documentNumber,
      numbering_rule_id: numberingRuleId,
      title: input.title,
      summary: input.summary,
      priority_level: input.priorityLevel,
      confidential_level: input.confidentialLevel,
      visibility_scope: input.visibilityScope,
    };
    const document = await documentsRepository.create(payload);
    
    // Auto-create sign request if document type requires digital signing
    if (documentType?.require_digital_signing) {
      const { signRequestsService } = await import('../signRequests/signRequests.service');
      const signRequest = await signRequestsService.createDraftSignRequest({
        document_id: document.id,
        tenant_id: tenantId,
        title: document.title || `Sign Request for ${document.original_file_name}`,
        auto_created: true,
      });
      
      // Link sign request to document
      await documentsRepository.update(document.id, {
        sign_request_id: signRequest.id,
      });
      
      // ✅ Auto-create signers from workflow if document has workflow
      const workflowId = input.workflowId || documentType.default_workflow_id;
      
      if (workflowId) {
        const workflow = await prisma.workflows.findUnique({
          where: { id: workflowId },
          include: { steps: { orderBy: { step_order: 'asc' } } }
        });
        
        if (workflow?.steps) {
          const { signersRepository } = await import('../signers/signers.repository');
          
          console.log(`[Workflow Signers] Creating signers for ${workflow.steps.length} steps`);
          
          for (const step of workflow.steps) {
            // Get approver info based on type
            let email = '';
            let name = '';
            
            console.log(`[Step ${step.step_order}] Type: ${step.approver_type}, ID: ${step.approver_id}`);
            
            if (step.approver_type === 'user' && step.approver_id) {
              const user = await prisma.users.findUnique({
                where: { id: step.approver_id },
                select: { email: true, full_name: true }
              });
              if (user) {
                email = user.email;
                name = user.full_name || user.email;
                console.log(`  ✓ Found user: ${email}`);
              } else {
                console.log(`  ✗ User not found`);
              }
            } else if (step.approver_type === 'role' && step.approver_id) {
              // For role, get first user with that role
              const userRole = await prisma.user_roles.findFirst({
                where: { role_id: step.approver_id },
                include: { user: { select: { email: true, full_name: true } } }
              });
              if (userRole?.user) {
                email = userRole.user.email;
                name = userRole.user.full_name || userRole.user.email;
                console.log(`  ✓ Found role user: ${email}`);
              } else {
                console.log(`  ✗ No user with this role`);
              }
            } else if (step.approver_type === 'department' && step.approver_id) {
              // For department, get department manager
              const dept = await prisma.departments.findUnique({
                where: { id: step.approver_id },
                include: { manager: { select: { email: true, full_name: true } } }
              });
              if (dept?.manager) {
                email = dept.manager.email;
                name = dept.manager.full_name || dept.manager.email;
                console.log(`  ✓ Found dept manager: ${email}`);
              } else {
                console.log(`  ✗ Department has no manager`);
              }
            } else if (step.approver_type === 'manager') {
              // For manager type, use document owner's manager
              const owner = await prisma.users.findUnique({
                where: { id: ownerId },
                include: { manager: { select: { email: true, full_name: true } } }
              });
              if (owner?.manager) {
                email = owner.manager.email;
                name = owner.manager.full_name || owner.manager.email;
                console.log(`  ✓ Found owner's manager: ${email}`);
              } else {
                console.log(`  ✗ Owner has no manager`);
              }
            }
            
            // Create signer if we found user info
            if (email) {
              await signersRepository.create({
                sign_request: { connect: { id: signRequest.id } },
                email,
                name,
                role: 'signer',
                signing_order: step.step_order,
                status: 'pending',
              });
              console.log(`  ✓ Signer created: ${email}`);
            } else {
              console.log(`  ✗ Skipped: no email found`);
            }
          }
          
          console.log(`[Workflow Signers] Completed`);
        }
        
        // ✅ Create workflow instance and approvals if document requires approval
        if (documentType?.require_approval && workflow) {
          console.log(`[Workflow Instance] Creating workflow instance for document ${document.id}`);
          
          // Create workflow instance
          const instance = await prisma.workflow_instances.create({
            data: {
              document_id: document.id,
              workflow_id: workflow.id,
              current_step_id: workflow.steps[0]?.id,
              status: 'in_progress',
              started_at: new Date()
            }
          });
          
          console.log(`[Workflow Instance] Created instance ID: ${instance.id}`);
          
          // Create approval for first step
          if (workflow.steps[0]) {
            const firstStep = workflow.steps[0];
            
            // Get approver user ID based on step type
            let approverUserId: number | null = null;
            
            if (firstStep.approver_type === 'user' && firstStep.approver_id) {
              approverUserId = firstStep.approver_id;
            } else if (firstStep.approver_type === 'role' && firstStep.approver_id) {
              const userRole = await prisma.user_roles.findFirst({
                where: { role_id: firstStep.approver_id }
              });
              approverUserId = userRole?.user_id || null;
            } else if (firstStep.approver_type === 'department' && firstStep.approver_id) {
              const dept = await prisma.departments.findUnique({
                where: { id: firstStep.approver_id }
              });
              approverUserId = dept?.manager_id || null;
            } else if (firstStep.approver_type === 'manager') {
              const owner = await prisma.users.findUnique({
                where: { id: ownerId }
              });
              approverUserId = owner?.manager_id || null;
            }
            
            if (approverUserId) {
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + (firstStep.due_in_days || 7));
              
              await prisma.document_approvals.create({
                data: {
                  document_id: document.id,
                  workflow_id: workflow.id,
                  workflow_step_id: firstStep.id,
                  approver_user_id: approverUserId,
                  action: 'pending',
                  due_date: dueDate
                }
              });
              
              console.log(`[Workflow Instance] Created approval for user ${approverUserId}`);
              
              // Update document status to pending_approval
              await documentsRepository.update(document.id, {
                status: 'pending_approval'
              });
              
              console.log(`[Workflow Instance] Document status updated to pending_approval`);
            } else {
              console.log(`[Workflow Instance] ⚠️ Could not determine approver for first step`);
            }
          }
        }
      }
      
      // ✅ Create manual signers if provided
      if (input.signers && input.signers.length > 0) {
        const { signersRepository } = await import('../signers/signers.repository');
        
        for (const signer of input.signers) {
          await signersRepository.create({
            sign_request: { connect: { id: signRequest.id } },
            email: signer.email,
            name: signer.name,
            role: 'signer',
            signing_order: signer.order,
            status: 'pending',
          });
        }
      }
      
      // ✅ Refresh document from DB to get updated sign_request_id
      const updatedDoc = await documentsRepository.findById(document.id, tenantId);
      if (updatedDoc) {
        return updatedDoc;
      }
    }
    
    // ✅ Save CC emails if provided
    if (input.ccEmails && input.ccEmails.length > 0) {
      for (const email of input.ccEmails) {
        await prisma.document_cc_emails.create({
          data: {
            document_id: document.id,
            email,
          },
        });
      }
    }
    
    // ✅ Save attachments if provided
    if (input.attachments && input.attachments.length > 0) {
      for (const attachment of input.attachments) {
        const attachmentPath = await saveBase64Document(
          tenantId,
          attachment.file_name,
          attachment.file_base64
        );
        
        const buffer = Buffer.from(attachment.file_base64, 'base64');
        const fileSize = buffer.length;
        
        await prisma.document_attachments.create({
          data: {
            document_id: document.id,
            file_name: attachment.file_name,
            file_path: attachmentPath,
            file_size: BigInt(fileSize),
            file_type: attachment.file_type,
          },
        });
      }
    }
    
    await auditService.record({
      tenantId,
      documentId: document.id,
      event: "document.uploaded",
      userId: ownerId,
      ip: requesterIp,
      ua: userAgent,
    });

    // NOTE: Workflow auto-submit removed - user must manually click "Trình duyệt"
    // This allows time to add sign fields before submitting for approval
    
    // Handle workflow based on 4 modes - DISABLED FOR NOW
    // User will manually submit via submitForApproval() method
    /*
    if (documentType && documentType.require_approval) {
      const { approvalsService } = await import('../approvals/approvals.service');

      // Mode 4: Ad-hoc (No default workflow)
      if (!documentType.default_workflow_id) {
        if (!input.adhocSteps || input.adhocSteps.length === 0) {
          throw ApiError.badRequest(
            'Loại văn bản này yêu cầu tạo luồng ký thủ công',
            'AD_HOC_STEPS_REQUIRED'
          );
        }

        const workflow = await this.createAdhocWorkflow(
          input.adhocSteps,
          document.id,
          tenantId,
          ownerId
        );

        await approvalsService.submitForApproval(
          document.id,
          workflow.id,
          tenantId,
          ownerId
        );

        // Refresh document to get updated status
        return await documentsRepository.findById(document.id, tenantId) || document;
      }

      // Mode 2: Strict (Use template as-is)
      if (!documentType.allow_workflow_override) {
        await approvalsService.submitForApproval(
          document.id,
          documentType.default_workflow_id,
          tenantId,
          ownerId
        );

        // Refresh document to get updated status
        return await documentsRepository.findById(document.id, tenantId) || document;
      }

      // Mode 3: Flexible (Use customized or default)
      if (input.customizedSteps && input.customizedSteps.length > 0) {
        const workflow = await this.createCustomizedWorkflow(
          documentType.default_workflow_id,
          input.customizedSteps,
          document.id,
          tenantId,
          ownerId
        );

        await approvalsService.submitForApproval(
          document.id,
          workflow.id,
          tenantId,
          ownerId
        );
      } else {
        // Use default template
        await approvalsService.submitForApproval(
          document.id,
          documentType.default_workflow_id,
          tenantId,
          ownerId
        );
      }
    }
    */

    return document;
  }

  async deleteDocument(documentId: number, tenantId: number, userId?: number): Promise<void> {
    const document = await this.getDocument(documentId, tenantId);
    
    // ✅ Status check: Only allow delete for 'draft' or 'cancelled' status
    const allowedStatuses = ['draft', 'cancelled'];
    if (!allowedStatuses.includes(document.status)) {
      throw ApiError.badRequest(
        `Không thể xóa tài liệu đang ở trạng thái "${document.status}". Chỉ có thể xóa tài liệu ở trạng thái "Nháp" hoặc "Đã hủy". Vui lòng hủy luồng ký/phê duyệt trước khi xóa.`,
        "DOCUMENT_DELETE_DENIED_STATUS"
      );
    }
    
    // ✅ Check sign request status if exists
    if (document.sign_request_id) {
      const signRequest = await prisma.sign_requests.findUnique({
        where: { id: document.sign_request_id },
        include: { signers: true }
      });
      
      if (signRequest && signRequest.status === 'pending') {
        throw ApiError.badRequest(
          "Tài liệu đang có luồng ký đang chờ xử lý. Vui lòng hủy luồng ký trước khi xóa tài liệu.",
          "DOCUMENT_HAS_PENDING_SIGNATURES"
        );
      }
    }
    
    // Ownership check: Only owner or admin can delete
    if (userId) {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        include: {
          user_roles: {
            include: {
              role: true
            }
          }
        }
      });
      
      if (!user || user.tenant_id !== tenantId) {
        throw ApiError.notFound("User not found", "USER_NOT_FOUND");
      }
      
      // Check if user is admin
      const isAdmin = user.user_roles.some(ur => 
        ur.role.name === 'Admin' || ur.role.name === 'admin'
      );
      
      // Check if user is owner
      const isOwner = document.owner_id === userId;
      
      if (!isAdmin && !isOwner) {
        throw ApiError.forbidden("You can only delete your own documents", "DOCUMENT_DELETE_DENIED");
      }
    }
    
    // Delete related data first to avoid foreign key constraints
    
    // 1. Delete audit logs
    await prisma.audit_logs.deleteMany({
      where: { document_id: document.id },
    });
    
    // 2. Delete sign request and related data if exists
    if (document.sign_request_id) {
      // Delete field values first
      await prisma.sign_request_field_values.deleteMany({
        where: {
          field: {
            sign_request_id: document.sign_request_id
          }
        }
      });
      
      // Delete fields
      await prisma.sign_request_fields.deleteMany({
        where: { sign_request_id: document.sign_request_id }
      });
      
      // Delete signers
      await prisma.signers.deleteMany({
        where: { sign_request_id: document.sign_request_id }
      });
      
      // Delete sign request
      await prisma.sign_requests.delete({
        where: { id: document.sign_request_id }
      });
    }
    
    // 3. Delete workflow instance and approvals if exists
    if (document.workflow_instance_id) {
      // Delete approvals first
      await prisma.document_approvals.deleteMany({
        where: { workflow_instance_id: document.workflow_instance_id }
      });
      
      // Delete workflow instance
      await prisma.workflow_instances.delete({
        where: { id: document.workflow_instance_id }
      });
    }
    
    // 4. Finally delete the document
    await documentsRepository.delete(document.id);
    
    // Note: Cannot record audit log after deletion since document_id is required
    // and the document no longer exists
  }

  /**
   * Create ad-hoc workflow from user-provided steps
   */
  async createAdhocWorkflow(
    steps: Array<{ approver_user_id: number; due_in_days: number }>,
    documentId: number,
    tenantId: number,
    userId: number
  ) {
    // Validate steps
    if (!steps || steps.length === 0) {
      throw ApiError.badRequest('Phải có ít nhất 1 bước phê duyệt', 'AD_HOC_STEPS_REQUIRED');
    }

    if (steps.length > 10) {
      throw ApiError.badRequest('Tối đa 10 bước', 'TOO_MANY_STEPS');
    }

    // Validate approvers exist and belong to tenant
    for (const step of steps) {
      const user = await prisma.users.findFirst({
        where: {
          id: step.approver_user_id,
          tenant_id: tenantId,
        },
      });

      if (!user) {
        throw ApiError.badRequest('Người phê duyệt không hợp lệ', 'INVALID_APPROVER');
      }

      if (step.due_in_days < 1 || step.due_in_days > 365) {
        throw ApiError.badRequest('Thời hạn phải từ 1-365 ngày', 'INVALID_DUE_DAYS');
      }
    }

    // Create ad-hoc workflow
    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `Ad-hoc workflow for Document #${documentId}`,
        description: 'User-created workflow',
        is_template: false,
        created_for_doc: documentId,
        created_by: userId,
        is_active: true,
      },
    });

    // Create workflow steps
    for (let i = 0; i < steps.length; i++) {
      await prisma.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: i + 1,
          step_name: `Bước ${i + 1}`,
          approver_type: 'user',
          approver_id: steps[i].approver_user_id,
          due_in_days: steps[i].due_in_days,
          is_required: true,
        },
      });
    }

    return workflow;
  }

  /**
   * Create customized workflow based on template
   */
  async createCustomizedWorkflow(
    templateId: number,
    customSteps: Array<{
      step_name?: string;
      approver_type: string;
      approver_id: number;
      due_in_days: number;
    }>,
    documentId: number,
    tenantId: number,
    userId: number
  ) {
    // Get template
    const template = await prisma.workflows.findFirst({
      where: {
        id: templateId,
        tenant_id: tenantId,
        is_template: true,
      },
    });

    if (!template) {
      throw ApiError.notFound('Workflow template không tồn tại', 'TEMPLATE_NOT_FOUND');
    }

    // Validate custom steps
    if (!customSteps || customSteps.length === 0) {
      throw ApiError.badRequest('Phải có ít nhất 1 bước', 'CUSTOM_STEPS_REQUIRED');
    }

    // Create customized workflow
    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `${template.name} (Tùy chỉnh cho #${documentId})`,
        description: `Customized from: ${template.name}`,
        is_template: false,
        created_for_doc: documentId,
        based_on_template: templateId,
        created_by: userId,
        is_active: true,
      },
    });

    // Create custom steps
    for (let i = 0; i < customSteps.length; i++) {
      await prisma.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: i + 1,
          step_name: customSteps[i].step_name || `Bước ${i + 1}`,
          approver_type: customSteps[i].approver_type,
          approver_id: customSteps[i].approver_id,
          due_in_days: customSteps[i].due_in_days,
          is_required: true,
        },
      });
    }

    return workflow;
  }

  async getDocumentFile(documentId: number, tenantId: number, userId?: number): Promise<{
    filePath: string;
    fileName: string;
    mimeType: string;
  }> {
    const document = await this.getDocument(documentId, tenantId, userId);
    
    // Get absolute file path
    const path = require('path');
    
    // Handle different path formats:
    // 1. "storage/1/file.pdf" -> resolve from cwd
    // 2. "/uploads/file.pdf" -> resolve from backend/ (legacy seed data)
    // 3. Absolute paths -> use as-is
    let filePath: string;
    
    if (path.isAbsolute(document.file_path)) {
      filePath = document.file_path;
    } else if (document.file_path.startsWith('storage/') || document.file_path.startsWith('storage\\')) {
      // Real uploaded files (from fileStorage.ts)
      // Storage is in backend/storage/ directory
      // process.cwd() is already backend/, so just resolve from there
      filePath = path.resolve(process.cwd(), document.file_path);
    } else if (document.file_path.startsWith('/uploads/')) {
      // Legacy seed data - files don't exist
      throw ApiError.notFound("File not found (seed data)", "FILE_NOT_FOUND");
    } else {
      // Fallback: try relative to cwd
      filePath = path.resolve(process.cwd(), document.file_path);
    }
    
    // Extract filename from path
    const fileName = path.basename(document.file_path);
    
    // Determine mime type from extension
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw ApiError.notFound("File not found on disk", "FILE_NOT_FOUND");
    }
    
    return { filePath, fileName, mimeType };
  }

  /**
   * Submit document for approval
   */
  async submitForApproval(documentId: number, tenantId: number, userId: number, workflowId?: number) {
    const document = await this.getDocument(documentId, tenantId, userId);
    
    // Validate status
    if (document.status !== 'draft') {
      throw ApiError.badRequest('Document must be in draft status', 'INVALID_STATUS');
    }
    
    // Get document type
    const documentType = await prisma.document_types.findUnique({
      where: { id: document.document_type_id! },
    });
    
    if (!documentType?.require_approval) {
      throw ApiError.badRequest('This document type does not require approval', 'APPROVAL_NOT_REQUIRED');
    }
    
    // If document has sign request, validate fields
    if (document.sign_request_id) {
      const { signRequestFieldsService } = await import('../signRequests/signRequestFields.service');
      const validation = await signRequestFieldsService.validateFieldsBeforeSend(document.sign_request_id);
      if (!validation.valid) {
        throw ApiError.badRequest(validation.message || 'Sign fields validation failed', 'SIGN_FIELDS_INVALID');
      }
    }
    
    // Determine workflow
    const finalWorkflowId = workflowId || documentType.default_workflow_id;
    
    if (finalWorkflowId) {
      // Has workflow - submit for approval
      const { approvalsService } = await import('../approvals/approvals.service');
      await approvalsService.submitForApproval(documentId, finalWorkflowId, tenantId, userId);
      
      // Update status
      await documentsRepository.update(documentId, {
        status: 'pending_approval',
      });
    } else {
      // No workflow - direct approve (simple approval without workflow)
      // Just mark as approved
      await documentsRepository.update(documentId, {
        status: 'approved',
      });
    }
    
    return await this.getDocument(documentId, tenantId, userId);
  }
}

export const documentsService = new DocumentsService();
