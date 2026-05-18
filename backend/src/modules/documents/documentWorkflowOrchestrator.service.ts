import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { documentsRepository } from "./documents.repository";
import { signRequestsRepository } from "../signRequests/signRequests.repository";
import { signersRepository } from "../signers/signers.repository";
import type { CreateDocumentInput } from "./documents.service";

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
    const { signRequestsService } = await import("../signRequests/signRequests.service");

    const signRequest = await signRequestsService.createDraftSignRequest({
      document_id: input.documentId,
      tenant_id: input.tenantId,
      title: input.documentTitle || `Sign Request for ${input.documentFileName}`,
      auto_created: true,
    });

    await documentsRepository.update(input.documentId, {
      sign_request_id: signRequest.id,
    });

    const workflow = await this.resolveWorkflowSnapshot(input);
    const workflowSignerCount = await this.seedWorkflowSigners(
      signRequest.id,
      workflow?.steps || [],
      input.tenantId,
      input.ownerId
    );

    await this.seedManualSigners(
      signRequest.id,
      input.signers || [],
      input.tenantId,
      workflowSignerCount
    );

    return { signRequest, workflow };
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

    for (let index = 0; index < orderedSigners.length; index += 1) {
      await signersRepository.update(orderedSigners[index].id, {
        status: index === 0 ? "pending" : "waiting_signing",
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

    const draftSigners = await signersRepository.findBySignRequest(signRequestId);
    for (const signer of draftSigners) {
      await signersRepository.update(signer.id, { status: "waiting_approval" });
    }

    await signRequestsRepository.updateStatus(signRequestId, tenantId, "pending_approval");
    await documentsRepository.update(documentId, { status: "pending_approval" });

    const { approvalsService } = await import("../approvals/approvals.service");
    await approvalsService.submitForApproval(documentId, workflowId, tenantId, userId);
  }

  private async completeSignRequestWithoutSigners(signRequest: NonNullable<Awaited<ReturnType<typeof signRequestsRepository.findById>>>) {
    await signRequestsRepository.updateStatus(signRequest.id, signRequest.tenant_id, "completed");
    if (signRequest.document_id) {
      await documentsRepository.update(signRequest.document_id, { status: "completed" });
    }
  }

  private async resolveWorkflowSnapshot(input: PrepareDraftPackageInput) {
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
        input.ownerId
      );
    }

    if (input.adhocSteps && input.adhocSteps.length > 0) {
      return this.createAdhocWorkflow(input.adhocSteps, input.documentId, input.tenantId, input.ownerId);
    }

    const snapshotWorkflowId = input.workflowId || input.documentType?.default_workflow_id;
    if (!snapshotWorkflowId) return null;

    return this.cloneWorkflowForDocument(
      snapshotWorkflowId,
      input.documentId,
      input.tenantId,
      input.ownerId
    );
  }

  private async seedWorkflowSigners(
    signRequestId: number,
    steps: Array<{
      step_order: number;
      approver_type: string | null;
      approver_id: number | null;
      participant_role: string | null;
    }>,
    tenantId: number,
    ownerId: number
  ) {
    const signerSteps = steps.filter((step) => step.participant_role === "signer");

    for (const step of signerSteps) {
      const resolvedSigner = await this.resolveSignerFromStep(step, tenantId, ownerId);
      if (!resolvedSigner?.email) continue;

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

      await signersRepository.create(signerData);
    }

    return signerSteps.length;
  }

  private async seedManualSigners(
    signRequestId: number,
    signers: NonNullable<CreateDocumentInput["signers"]>,
    tenantId: number,
    workflowSignerCount: number
  ) {
    if (!signers.length) return;

    const signerEmails = signers.map((signer) => signer.email);
    const internalUsers = await prisma.users.findMany({
      where: {
        tenant_id: tenantId,
        email: { in: signerEmails },
        status: "active",
      },
      select: { id: true, email: true },
    });
    const internalUserMap = new Map(internalUsers.map((user) => [user.email, user.id]));

    const currentSigners = await signersRepository.findBySignRequest(signRequestId);
    const maxExistingOrder = currentSigners.reduce(
      (maxOrder, signer) => Math.max(maxOrder, signer.signing_order || 0),
      workflowSignerCount
    );

    for (const signer of signers) {
      const internalUserId = internalUserMap.get(signer.email) || null;
      await signersRepository.create({
        sign_request: { connect: { id: signRequestId } },
        email: signer.email,
        name: signer.name,
        role: "signer",
        signing_order: maxExistingOrder + (signer.order || 1),
        status: "draft",
        is_internal: !!internalUserId,
        ...(internalUserId ? { user: { connect: { id: internalUserId } } } : {}),
      });
    }
  }

  private async resolveSignerFromStep(
    step: {
      approver_type: string | null;
      approver_id: number | null;
    },
    tenantId: number,
    ownerId: number
  ) {
    let email = "";
    let name = "";

    if (step.approver_type === "user" && step.approver_id) {
      const user = await prisma.users.findUnique({
        where: { id: step.approver_id },
        select: { id: true, email: true, full_name: true },
      });
      if (user) {
        email = user.email;
        name = user.full_name || user.email;
        return { email, name, userId: user.id };
      }
    }

    if (step.approver_type === "role" && step.approver_id) {
      const userRole = await prisma.user_roles.findFirst({
        where: { role_id: step.approver_id },
        include: { user: { select: { id: true, email: true, full_name: true } } },
      });
      if (userRole?.user) {
        email = userRole.user.email;
        name = userRole.user.full_name || userRole.user.email;
        return { email, name, userId: userRole.user.id };
      }
    }

    if (step.approver_type === "department" && step.approver_id) {
      const dept = await prisma.departments.findUnique({
        where: { id: step.approver_id },
        include: { manager: { select: { id: true, email: true, full_name: true } } },
      });
      if (dept?.manager) {
        email = dept.manager.email;
        name = dept.manager.full_name || dept.manager.email;
        return { email, name, userId: dept.manager.id };
      }
    }

    if (step.approver_type === "manager") {
      const owner = await prisma.users.findUnique({
        where: { id: ownerId },
        include: { manager: { select: { id: true, email: true, full_name: true } } },
      });
      if (owner?.manager) {
        email = owner.manager.email;
        name = owner.manager.full_name || owner.manager.email;
        return { email, name, userId: owner.manager.id };
      }
    }

    if (!email) return null;

    const internalUser = await prisma.users.findFirst({
      where: {
        tenant_id: tenantId,
        email,
        status: "active",
      },
      select: { id: true },
    });

    return {
      email,
      name: name || email,
      userId: internalUser?.id || null,
    };
  }

  private async createAdhocWorkflow(
    steps: AdhocStepInput[],
    documentId: number,
    tenantId: number,
    userId: number
  ) {
    if (!steps || steps.length === 0) {
      throw ApiError.badRequest("Phai co it nhat 1 buoc phe duyet", "AD_HOC_STEPS_REQUIRED");
    }

    if (steps.length > 10) {
      throw ApiError.badRequest("Toi da 10 buoc", "TOO_MANY_STEPS");
    }

    for (const step of steps) {
      const user = await prisma.users.findFirst({
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

    const workflow = await prisma.workflows.create({
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
      await prisma.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: i + 1,
          step_name: `Buoc ${i + 1}`,
          approver_type: "user",
          approver_id: steps[i].approver_user_id,
          due_in_days: steps[i].due_in_days,
          is_required: true,
        },
      });
    }

    return prisma.workflows.findUnique({
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
    userId: number
  ) {
    const template = await prisma.workflows.findFirst({
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

    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `${template.name} (Tuy chinh cho #${documentId})`,
        description: `Customized from: ${template.name}`,
        is_template: false,
        created_for_doc: documentId,
        based_on_template: templateId,
        created_by: userId,
        is_active: true,
      },
    });

    for (let i = 0; i < normalizedSteps.length; i += 1) {
      await prisma.workflow_steps.create({
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

    return prisma.workflows.findUnique({
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
    userId: number
  ) {
    const template = await prisma.workflows.findFirst({
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

    const workflow = await prisma.workflows.create({
      data: {
        tenant_id: tenantId,
        name: `${template.name} (Document #${documentId})`,
        description: template.description,
        document_type_id: template.document_type_id,
        is_template: false,
        created_for_doc: documentId,
        based_on_template: template.is_template ? template.id : template.based_on_template || template.id,
        created_by: userId,
        is_active: true,
      },
    });

    for (const step of template.steps) {
      await prisma.workflow_steps.create({
        data: {
          workflow_id: workflow.id,
          step_order: step.step_order,
          step_name: step.step_name,
          approver_type: step.approver_type,
          approver_id: step.approver_id,
          participant_role: step.participant_role,
          due_in_days: step.due_in_days,
          is_required: step.is_required,
          is_parallel: step.is_parallel,
          conditions: step.conditions as Prisma.InputJsonValue,
        },
      });
    }

    return prisma.workflows.findUnique({
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
