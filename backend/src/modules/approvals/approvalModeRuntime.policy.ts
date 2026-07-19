import type { WorkflowApprovalMode } from '../workflows/workflowApprovalMode';

export type RuntimeApprovalAction = 'pending' | 'waiting';

export function initialApprovalAction(
  mode: WorkflowApprovalMode,
  stepIndex: number,
): RuntimeApprovalAction {
  return mode === 'sequential' && stepIndex > 0 ? 'waiting' : 'pending';
}

export function initialCurrentStepId(
  mode: WorkflowApprovalMode,
  firstStepId: number,
): number | null {
  return mode === 'sequential' ? firstStepId : null;
}

export function isApprovalActionableInRun(input: {
  mode: WorkflowApprovalMode;
  approvalAction: string | null | undefined;
  workflowRunStatus: string | null | undefined;
  currentStepId: number | null | undefined;
  approvalStepId: number;
  documentStatus: string | null | undefined;
}): boolean {
  if (input.approvalAction !== 'pending' || input.workflowRunStatus !== 'in_progress') {
    return false;
  }

  if (input.documentStatus !== 'pending_approval') {
    return false;
  }

  return input.mode === 'parallel' || input.currentStepId === input.approvalStepId;
}

export function isParallelApprovalComplete(
  actions: Array<string | null | undefined>,
): boolean {
  return actions.length > 0 && actions.every((action) => action === 'approved');
}
