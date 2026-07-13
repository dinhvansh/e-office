export type DocumentWorkflowStatus =
  | "draft"
  | "pending_approval"
  | "pending_signature"
  | "in_progress"
  | "generating_artifact"
  | "artifact_failed"
  | "completed"
  | "rejected"
  | "cancelled"
  | "archived";

const allowedDocumentTransitions: Record<DocumentWorkflowStatus, readonly DocumentWorkflowStatus[]> = {
  draft: ["pending_approval", "pending_signature", "cancelled"],
  pending_approval: ["pending_signature", "completed", "rejected", "cancelled"],
  pending_signature: ["in_progress", "generating_artifact", "rejected", "cancelled"],
  in_progress: ["generating_artifact", "rejected", "cancelled"],
  generating_artifact: ["completed", "artifact_failed"],
  artifact_failed: ["generating_artifact", "cancelled"],
  completed: ["archived"],
  rejected: ["draft", "pending_approval"],
  cancelled: [],
  archived: [],
};

export function canTransitionDocumentStatus(from: string | null, to: string): boolean {
  if (!from || !(from in allowedDocumentTransitions)) return false;
  return allowedDocumentTransitions[from as DocumentWorkflowStatus].includes(to as DocumentWorkflowStatus);
}

export function assertDocumentStatusTransition(from: string | null, to: string): void {
  if (!canTransitionDocumentStatus(from, to)) {
    throw new Error(`WORKFLOW_TRANSITION_INVALID:${from ?? "null"}->${to}`);
  }
}
