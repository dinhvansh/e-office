import { ApiError } from "../../core/errors/api-error";

export const workflowApprovalModes = ["sequential", "parallel"] as const;
export type WorkflowApprovalMode = typeof workflowApprovalModes[number];

export function normalizeWorkflowApprovalMode(value?: string | null): WorkflowApprovalMode {
  const mode = value ?? "sequential";
  if (!workflowApprovalModes.includes(mode as WorkflowApprovalMode)) {
    throw ApiError.badRequest("Invalid workflow approval mode", "WORKFLOW_APPROVAL_MODE_INVALID");
  }
  return mode as WorkflowApprovalMode;
}
