import { prisma } from "../../config/prisma";
import {
  getDefaultCompletionMode,
  isWorkflowAssigneeType,
  isWorkflowCompletionMode,
  resolveAssigneeType,
  type WorkflowCompletionMode,
} from "../workflows/workflowStepAssignment";

class SigningProgressService {
  async getSignerStepCompletionConfig(documentId: number, signingOrder: number) {
    const document = await prisma.documents.findUnique({
      where: { id: documentId },
      select: { workflow_instance: { select: { workflow_id: true } } },
    });
    const workflowId = document?.workflow_instance?.workflow_id;
    if (!workflowId) return { completionMode: "all" as WorkflowCompletionMode, minRequired: 1 };

    const step = await prisma.workflow_steps.findFirst({
      where: { workflow_id: workflowId, participant_role: "signer", step_order: signingOrder },
      select: { approver_type: true, assignee_type: true, completion_mode: true, min_required: true },
    });
    const assigneeType = step
      ? resolveAssigneeType({
          approver_type: step.approver_type ?? undefined,
          assignee_type: isWorkflowAssigneeType(step.assignee_type) ? step.assignee_type : undefined,
        })
      : null;
    return {
      completionMode: step && isWorkflowCompletionMode(step.completion_mode)
        ? step.completion_mode
        : getDefaultCompletionMode(assigneeType ?? "specific_user"),
      minRequired: Math.max(1, step?.min_required || 1),
    };
  }

  isSignerStatusComplete(status?: string | null) {
    return status === "signed" || status === "completed";
  }
}

export const signingProgressService = new SigningProgressService();
