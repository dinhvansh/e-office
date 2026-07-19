import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { documentsRepository } from "./documents.repository";
import { signRequestsRepository } from "../signRequests/signRequests.repository";
import { signersRepository } from "../signers/signers.repository";
import type { CreateDocumentInput } from "./documents.service";
import { isWorkflowAssigneeType, resolveAssigneeType } from "../workflows/workflowStepAssignment";

type CustomizedStepInput = {
  step_name?: string;
  approver_type: string;
  approver_id: number;
  participant_role?: string;
  due_in_days: number;
  order?: number;
};

type AdhocStepInput = {
  approver_user_id: number;
  due_in_days: number;
};

type PrepareDraftPackageInput = {
  documentId: number;
  tenantId: number;
  ownerId: number;
  documentTitle?: string | null;
  documentFileName: string;
  workflowId?: number;
  signers?: CreateDocumentInput["signers"];
  customizedSteps?: CustomizedStepInput[];
  adhocSteps?: AdhocStepInput[];
  documentType?: {
    default_workflow_id?: number | null;
    require_approval?: boolean | null;
  } | null;
};

class DocumentWorkflowOrchestratorService {
  async prepareDraftPackage(input: PrepareDraftPackageInput) {
    return prisma.$transaction(async (tx) => {
      const signRequest = await tx.sign_requests.create({
        data: {
          document_id: input.documentId,
          tenant_id: input.tenantId,
          title: input.documentTitle || `Sign Request for ${input.documentFileName}`,
          workflow_type: "sequential",
          status: "draft",
          auto_created: true,
        },
      });
      await tx.documents.update({ where: { id: input.documentId }, data: { sign_request_id: signRequest.id } });

      const workflow = await this.resolveWorkflowSnapshot(input, tx);
      const workflowSignerCount = await this.seedWorkflowSigners(
        signRequest.id, workflow?.steps || [], input.tenantId, input.ownerId, tx,
      );
      await this.seedManualSigners(signRequest.id, input.signers || [], input.tenantId, workflowSignerCount, tx);
      return { signRequest, workflow };
    });
  }

  async beginRuntimeFlow(signRequestId: number, tenantId: number, userId: number) {
    const signRequest = await signRequestsRepository.findById(signRequestId, tenantId);
    if (!signRequest) {
      throw ApiError.notFound("Sign request not found", "SIGN_REQUEST_NOT_FOUND");
    }

    const documentType = signRequest.document?.document_type_id
      ? await prisma.document_types.findUnique({
          where: { id: signRequest.document.document_type_id },
          select: { require_approval: true },
        })
      : null;

    const documentWorkflow = signRequest.document_id
      ? await prisma.workflows.findFirst({
          where: {
            tenant_id: tenantId,
            created_for_doc: signRequest.document_id,
            is_active: true,
          },
          include: {
            steps: {
              orderBy: { step_order: "asc" },
            },
          },
          orderBy: { id: "desc" },
        })
      : null;

    const approverSteps =
      documentWorkflow?.steps.filter(
        (step) => step.participant_role === "approver" || !step.participant_role
      ) || [];

    if (documentType?.require_approval && !documentWorkflow) {
      throw ApiError.badRequest("Workflow is required for approval flow", "WORKFLOW_REQUIRED");
    }

    if (approverSteps.length > 0) {
      await this.moveToApprovalPhase(signRequestId, tenantId, userId, signRequest.document_id, documentWorkflow!.id);
      return { phase: "approval" as const };
    }

    const activation = await this.activateSigningPhase(signRequestId, tenantId);
    return {
      phase: activation.completedWithoutSigners ? ("completed" as const) : ("signing" as const),
    };
  }

  async activateSigningPhase(signRequestId: number, tenantId: number) {
    const signRequest = await signRequestsRepository.findById(signRequestId, tenantId);
    if (!signRequest) {
      throw ApiError.notFound("Sign request not found", "SIGN_REQUEST_NOT_FOUND");
    }

    const orderedSigners = (await signersRepository.findBySignRequest(signRequestId))
      .filter((signer) => !["signed", "completed", "rejected"].includes(signer.status || ""))
      .sort((a, b) => (a.signing_order || 0) - (b.signing_order || 0));

    if (orderedSigners.length === 0) {
      await this.completeSignRequestWithoutSigners(signRequest);
      return { completedWithoutSigners: true };
    }

    const firstOrder = orderedSigners[0].signing_order || 0;
    for (let index = 0; index < orderedSigners.length; index += 1) {
      await signersRepository.update(orderedSigners[index].id, {
        status: (orderedSigners[index].signing_order || 0) === firstOrder ? "pending" : "waiting_signing",
      });
    }

    await signRequestsRepository.updateStatus(signRequestId, tenantId, "pending");

    if (signRequest.document_id) {
      await documentsRepository.update(signRequest.document_id, {
        status: "pending_signature",
      });
    }

    return { completedWithoutSigners: false };
  }

  private async moveToApprovalPhase(
    signRequestId: number,
    tenantId: number,
    userId: number,
    documentId: number | null,
    workflowId: number
  ) {
    if (!documentId) {
      throw ApiError.badRequest("Approval flow requires a linked document", "DOCUMENT_REQUIRED");
    }

    const { approvalsService } = await import("../approvals/approvals.service");
    // Runtime creation owns the atomic transition of the document, linked sign
    // request, draft signers, workflow instance, and approval rows.
    await approvalsService.submitForApproval(documentId, workflowId, tenantId, userId);
  }

  private async completeSignRequestWithoutSigners(signRequest: NonNullable<Awaited<ReturnType<typeof signRequestsRepository.findById>>>) {
    await signRequestsRepository.updateStatus(signRequest.id, signRequest.tenant_id, "completed");
    if (signRequest.document_id) {
      await documentsRepository.update(signRequest.document_id, { status: "completed" });
    }
  }

  private async resolveWorkflowSnapshot(input: PrepareDraftPackageInput, db: DbClient) {
    if (input.customizedSteps && input.customizedSteps.length > 0) {
      const sourceWorkflowId = input.workflowId || input.documentType?.default_workflow_id;
      if (!sourceWorkflowId) {
        throw ApiError.badRequest(
          "Customized workflow requires a source workflow template",
          "WORKFLOW_TEMPLATE_REQUIRED"
        );
      }

      return this.createCustomizedWorkflow(
        sourceWorkflowId,
        input.customizedSteps,
        input.documentId,
        input.tenantId,
        input.ownerId, db
      );
    }

    if (input.adhocSteps && input.adhocSteps.length > 0) {
      return this.createAdhocWorkflow(input.adhocSteps, input.documentId, input.tenantId, input.ownerId, db);
    }

    const snapshotWorkflowId = input.workflowId || input.documentType?.default_workflow_id;
    if (!snapshotWorkflowId) return null;

    return this.cloneWorkflowForDocument(
      snapshotWorkflowId,
      input.documentId,
      input.tenantId,
      input.ownerId, db
    );
  }

  private async seedWorkflowSigners(
    signRequestId: number,
    steps: Array<{
      step_order: number;
      approver_type: string | null;
      approver_id: number | null;
      assignee_type?: string | null;
      assignee_user_id?: number | null;
      assignee_department_id?: number | null;
      assignee_position_id?: number | null;
      participant_role: string | null;
    }>,
    tenantId: number,
    ownerId: number,
    db: DbClient,
  ) {
    const signerSteps = steps.filter((step) => step.participant_role === "signer");

    for (const step of signerSteps) {
      const resolvedSigners = await this.resolveSignerCandidatesFromStep(step, tenantId, ownerId, db);
      for (const resolvedSigner of resolvedSigners) {
        const signerData: Prisma.signersCreateInput = {
          sign_request: { connect: { id: signRequestId } },
          email: resolvedSigner.email,
          name: resolvedSigner.name,
          role: "signer",
          signing_order: step.step_order,
          status: "draft",
          is_internal: !!resolvedSigner.userId,
        };

        if (resolvedSigner.userId) {
          signerData.user = { connect: { id: resolvedSigner.userId } };
        }

        await db.signers.create({ data: signerData });
      }
    }

    return signerSteps.length;
  }

  private async seedManualSigners(
    signRequestId: number,
    signers: NonNullable<CreateDocumentInput["signers"]>,
    tenantId: number,
    workflowSignerCount: number,
    db: DbClient,
  ) {
    if (!signers.length) return;

    const signerEmails = signers.map((signer) => signer.email);
    const internalUsers = await db.users.findMany({
      where: {
        tenant_id: tenantId,
        email: { in: signerEmails },
        status: "active",
      },
      select: { id: true, email: true },
    });
    const internalUserMap = new Map(internalUsers.map((user) => [user.email, user.id]));

    const currentSigners = await db.signers.findMany({ where: { sign_request_id: signRequestId } });
    const maxExistingOrder = currentSigners.reduce(
      (maxOrder, signer) => Math.max(maxOrder, signer.signing_order || 0),
      workflowSignerCount
    );

    for (const signer of signers) {
      const internalUserId = internalUserMap.get(signer.email) || null;
      await db.signers.create({ data: {
        sign_request: { connect: { id: signRequestId } },
        email: signer.email,
        name: signer.name,
        role: "signer",
        signing_order: maxExistingOrder + (signer.order || 1),
        status: "draft",
        is_internal: !!internalUserId,
        ...(internalUserId ? { user: { connect: { id: internalUserId } } } : {}),
      }});
    }
  }

  private async resolveSignerCandidatesFromStep(
    step: {
      approver_type: string | null;
      approver_id: number | null;
      assignee_type?: string | null;
      assignee_user_id?: number | null;
      assignee_department_id?: number | null;
      assignee_position_id?: number | null;
    },
    tenantId: number,
    ownerId: number,
    db: DbClient,
  ) {
    const assigneeType = resolveAssigneeType({
      approver_type: step.approver_type ?? undefined,
      approver_id: step.approver_id ?? undefined,
      assignee_type: isWorkflowAssigneeType(step.assignee_type) ? step.assignee_type : undefined,
      assignee_user_id: step.assignee_user_id ?? undefined,
      assignee_department_id: step.assignee_department_id ?? undefined,
      assignee_position_id: step.assignee_position_id ?? undefined,
    });
    let candidates: Array<{ id: number; email: string; full_name: string | null }> = [];

    if (assigneeType === "specific_user" && (step.assignee_user_id || step.approver_id)) {
      const user = await db.users.findFirst({
        where: { id: step.assignee_user_id || step.approver_id || undefined, tenant_id: tenantId, status: "active" },
        select: { id: true, email: true, full_name: true },
      });
      if (user) candidates = [user];
    } else if (assigneeType === "department_manager" && (step.assignee_department_id || step.approver_id)) {
      const department = await db.departments.findFirst({
        where: { id: step.assignee_department_id || step.approver_id || undefined, tenant_id: tenantId },
        include: { manager: { select: { id: true, email: true, full_name: true, status: true } } },
      });
      if (department?.manager?.status === "active") {
        candidates = [department.manager];
      }
    } else if (assigneeType === "position_in_department" && step.assignee_department_id && step.assignee_position_id) {
      candidates = await db.users.findMany({
        where: {
          tenant_id: tenantId,
          department_id: step.assignee_department_id,
          position_id: step.assignee_position_id,
          status: "active",
        },
        select: { id: true, email: true, full_name: true },
      });
    } else if (assigneeType === "direct_manager") {
      const owner = await db.users.findUnique({
        where: { id: ownerId },
        include: { manager: { select: { id: true, email: true, full_name: true, status: true } } },
      });
      if (owner?.manager?.status === "active") {
        candidates = [owner.manager];
      }
    } else if (step.approver_type === "role" && step.approver_id) {
      const userRoles = await db.user_roles.findMany({
        where: { role_id: step.approver_id, user: { tenant_id: tenantId, status: "active" } },
        include: { user: { select: { id: true, email: true, full_name: true } } },
      });
      candidates = userRoles.map((entry) => entry.user).filter(Boolean);
    }

    const deduped = new Map<number, { id: number; email: string; full_name: string | null }>();
    for (const candidate of candidates) {
      deduped.set(candidate.id, candidate);
    }

    return [...deduped.values()].map((candidate) => ({
      email: candidate.email,
      name: candidate.full_name || candidate.email,
      userId: candidate.id,
    }));
  }

  private async createAdhocWorkflow(
    steps: AdhocStepInput[],
    documentId: number,
    tenantId: number,
    userId: number,
    db: DbClient,
  ) {
    if (!steps || steps.length === 0) {
      throw ApiError.badRequest("Phai co it nhat 1 buoc phe duyet", "AD_HOC_STEPS_REQUIRED");
    }

    if (steps.length > 10) {
      throw ApiError.badRequest("Toi da 10 buoc", "TOO_MANY_STEPS");
    }

    for (const step of steps) {
      const user = await db.users.findFirst({
        where: {
          id: step.approver_user_id,
          tenant_id: tenantId,
        },
      });

      if (!user) {
        throw ApiError.badRequest("Nguoi phe duyet khong hop le", "INVALID_APPROVER");
      }

      if (step.due_in_days < 1 || step.due_in_days > 365) {
        throw ApiError.badRequest("Thoi han phai tu 1-365 ngay", "INVALID_DUE_DAYS");
      }
    }

    const workflow = await db.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `Ad-hoc workflow for Document #${documentId}`,
        description: "User-created workflow",
        is_template: false,
        created_for_doc: documentId,
        created_by: userId,
        is_active: true,
      },
    });

    for (let i = 0; i < steps.length; i += 1) {
      await db.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: i + 1,
          step_name: `Buoc ${i + 1}`,
          approver_type: "user",
          approver_id: steps[i].approver_user_id,
          assignee_type: "specific_user",
          assignee_user_id: steps[i].approver_user_id,
          completion_mode: "all",
          due_in_days: steps[i].due_in_days,
          is_required: true,
        },
      });
    }

    return db.workflows.findUnique({
      where: { id: workflow.id },
      include: {
        steps: {
          orderBy: { step_order: "asc" },
        },
      },
    });
  }

  private async createCustomizedWorkflow(
    templateId: number,
    customSteps: CustomizedStepInput[],
    documentId: number,
    tenantId: number,
    userId: number,
    db: DbClient,
  ) {
    const template = await db.workflows.findFirst({
      where: {
        id: templateId,
        tenant_id: tenantId,
        is_template: true,
      },
    });

    if (!template) {
      throw ApiError.notFound("Workflow template khong ton tai", "TEMPLATE_NOT_FOUND");
    }

    if (!customSteps || customSteps.length === 0) {
      throw ApiError.badRequest("Phai co it nhat 1 buoc", "CUSTOM_STEPS_REQUIRED");
    }

    const normalizedSteps = [...customSteps]
      .map((step, index) => ({
        ...step,
        order: typeof step.order === "number" && step.order > 0 ? step.order : index + 1,
      }))
      .sort((a, b) => {
        if ((a.order || 0) === (b.order || 0)) return 0;
        return (a.order || 0) - (b.order || 0);
      });

    for (const step of normalizedSteps) {
      if (!step.approver_id || step.approver_id <= 0) {
        throw ApiError.badRequest("Moi buoc phai co nguoi phu trach hop le", "INVALID_STEP_APPROVER");
      }
    }

    const workflow = await db.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `${template.name} (Tuy chinh cho #${documentId})`,
        description: `Customized from: ${template.name}`,
        is_template: false,
        created_for_doc: documentId,
        based_on_template: templateId,
        approval_mode: template.approval_mode,
        created_by: userId,
        is_active: true,
      },
    });

    for (let i = 0; i < normalizedSteps.length; i += 1) {
      await db.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: i + 1,
          step_name: normalizedSteps[i].step_name || `Buoc ${i + 1}`,
          approver_type: normalizedSteps[i].approver_type,
          approver_id: normalizedSteps[i].approver_id,
          participant_role: normalizedSteps[i].participant_role || "approver",
          due_in_days: normalizedSteps[i].due_in_days,
          is_required: true,
        },
      });
    }

    return db.workflows.findUnique({
      where: { id: workflow.id },
      include: {
        steps: {
          orderBy: { step_order: "asc" },
        },
      },
    });
  }

  private async cloneWorkflowForDocument(
    templateId: number,
    documentId: number,
    tenantId: number,
    userId: number,
    db: DbClient,
  ) {
    const template = await db.workflows.findFirst({
      where: {
        id: templateId,
        tenant_id: tenantId,
        is_active: true,
      },
      include: {
        steps: {
          orderBy: { step_order: "asc" },
        },
      },
    });

    if (!template) {
      throw ApiError.notFound("Workflow not found", "WORKFLOW_NOT_FOUND");
    }

    const workflow = await db.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `${template.name} (Document #${documentId})`,
        description: template.description,
        document_type_id: template.document_type_id,
        is_template: false,
        created_for_doc: documentId,
        based_on_template: template.is_template ? template.id : template.based_on_template || template.id,
        approval_mode: template.approval_mode,
        created_by: userId,
        is_active: true,
      },
    });

    for (const step of template.steps) {
      await db.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: step.step_order,
          step_name: step.step_name,
          approver_type: step.approver_type,
          approver_id: step.approver_id,
          assignee_type: step.assignee_type,
          assignee_user_id: step.assignee_user_id,
          assignee_department_id: step.assignee_department_id,
          assignee_position_id: step.assignee_position_id,
          completion_mode: step.completion_mode,
          min_required: step.min_required,
          participant_role: step.participant_role,
          due_in_days: step.due_in_days,
          is_required: step.is_required,
          is_parallel: step.is_parallel,
          conditions: step.conditions as Prisma.InputJsonValue,
        },
      });
    }

    return db.workflows.findUnique({
      where: { id: workflow.id },
      include: {
        steps: {
          orderBy: { step_order: "asc" },
        },
      },
    });
  }
}

export const documentWorkflowOrchestratorService = new DocumentWorkflowOrchestratorService();
