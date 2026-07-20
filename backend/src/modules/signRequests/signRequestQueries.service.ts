import { ApiError } from "../../core/errors/api-error";
import { authorizationService } from "../authorization/authorization.service";
import { prisma } from "../../config/prisma";
import { buildSignRequestFlowHints, buildWorkflowStatusSummary } from "./signRequestFlow.policy";
import { normalizeStoredFieldBox } from "./coordinate.helper";
import { signRequestsRepository } from "./signRequests.repository";
import { buildSignRequestProgress } from "./signRequestProgress.policy";

class SignRequestQueriesService {
  async getSignRequest(id: number, tenantId: number, userId?: number) {
    const signRequest = await signRequestsRepository.findById(id, tenantId);
    if (!signRequest) {
      throw ApiError.notFound("Sign request not found", "SIGN_REQUEST_NOT_FOUND");
    }
    if (userId) {
      const access = await authorizationService.canAccessDocument(userId, tenantId, signRequest.document_id, "read");
      if (!access.allowed) {
        throw ApiError.forbidden("Permission denied to view sign request", "SIGN_REQUEST_READ_DENIED");
      }
    }

    const [workflowSnapshot, latestRun, canManage] = await Promise.all([
      this.getWorkflowSnapshotForDocument(signRequest.document_id, tenantId),
      prisma.workflow_instances.findFirst({
        where: { document_id: signRequest.document_id, document: { tenant_id: tenantId } },
        orderBy: { run_number: "desc" },
        select: { approvals: { select: { action: true } } },
      }),
      userId
        ? authorizationService.canAccessDocument(userId, tenantId, signRequest.document_id, "edit").then((decision) => decision.allowed)
        : Promise.resolve(false),
    ]);
    const approvals = latestRun?.approvals || [];
    return {
      ...signRequest,
      fields: signRequest.fields.map((field) => {
        const normalized = normalizeStoredFieldBox(field);
        return {
          ...field,
          pageIndex: Math.max(0, (field.page || 1) - 1),
          coordinateVersion: 2,
          coordinateUnit: "ratio",
          coordinateAnchor: "top-left",
          xPct: normalized.xPct,
          yPct: normalized.yPct,
          widthPct: normalized.widthPct,
          heightPct: normalized.heightPct,
        };
      }),
      workflow_snapshot: workflowSnapshot,
      progress: buildSignRequestProgress(signRequest.signers, approvals),
      ...buildSignRequestFlowHints(signRequest.status, signRequest.signers),
      status_summary: buildWorkflowStatusSummary({
        status: signRequest.status,
        signers: signRequest.signers,
        approvals,
        deadline: signRequest.deadline,
        canRetryArtifact: canManage,
      }),
    };
  }

  async getSignRequestWithFlowHints(id: number, tenantId: number) {
    return this.getSignRequest(id, tenantId);
  }

  private async getWorkflowSnapshotForDocument(documentId: number, tenantId: number) {
    const workflow = await prisma.workflows.findFirst({
      where: { tenant_id: tenantId, created_for_doc: documentId, is_active: true },
      include: { steps: { orderBy: { step_order: "asc" } } },
      orderBy: { id: "desc" },
    });
    if (!workflow) return null;
    return {
      id: workflow.id,
      based_on_template: workflow.based_on_template,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        step_name: step.step_name,
        approver_type: step.approver_type,
        approver_id: step.approver_id,
        participant_role: step.participant_role || "approver",
        due_in_days: step.due_in_days,
        order: step.step_order,
      })),
    };
  }
}

export const signRequestQueriesService = new SignRequestQueriesService();
