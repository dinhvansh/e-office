export type SignRequestFlowSigner = {
  status: string | null;
};

export type SignRequestFlowHints = {
  flow_state: "DRAFT" | "COMPLETED" | "CANCELLED" | "REJECTED" | "AWAITING_APPROVAL" | "AWAITING_SIGNATURES" | "GENERATING_ARTIFACT" | "ARTIFACT_FAILED";
  next_action: "EDIT_AND_SEND" | "VIEW_COMPLETED" | "REVIEW_STATUS" | "WAIT_FOR_APPROVAL" | "WAIT_FOR_SIGNING" | "WAIT_FOR_ARTIFACT";
  flow_counters: {
    total_signers: number;
    pending: number;
    waiting_approval: number;
    waiting_signing: number;
    signed: number;
  };
};

/** A stable, presentation-neutral status contract for detail screens. */
export type WorkflowStatusSummary = {
  status: string;
  current_actor: "requester" | "approver" | "signer" | "system" | null;
  next_action: SignRequestFlowHints["next_action"] | "RETRY_ARTIFACT";
  progress: { completed: number; total: number };
  deadline: string | null;
  can_retry_artifact: boolean;
};

export function buildWorkflowStatusSummary(input: {
  status: string | null | undefined;
  signers: readonly SignRequestFlowSigner[];
  deadline?: Date | string | null;
  canRetryArtifact?: boolean;
}): WorkflowStatusSummary {
  const hints = buildSignRequestFlowHints(input.status, input.signers);
  const status = input.status || "draft";
  const completed = input.signers.filter((signer) => ["signed", "completed"].includes(signer.status ?? "")).length;
  const waitingApproval = hints.flow_counters.waiting_approval > 0 || status === "pending_approval";
  const waitingSigning = hints.flow_counters.waiting_signing > 0 || hints.flow_counters.pending > 0 || ["pending", "in_progress", "pending_signature"].includes(status);
  const actor = status === "draft" ? "requester"
    : waitingApproval ? "approver"
    : waitingSigning ? "signer"
    : ["generating_artifact", "artifact_failed"].includes(status) ? "system"
    : null;

  return {
    status,
    current_actor: actor,
    next_action: status === "artifact_failed" ? "RETRY_ARTIFACT" : hints.next_action,
    progress: { completed, total: input.signers.length },
    deadline: input.deadline ? new Date(input.deadline).toISOString() : null,
    can_retry_artifact: status === "artifact_failed" && Boolean(input.canRetryArtifact),
  };
}

export function isEditableSignRequestStatus(status: string | null | undefined): boolean {
  return status === "draft" || status === "rejected" || status === "cancelled";
}

export function canSendSignRequestStatus(status: string | null | undefined): boolean {
  return status !== "completed";
}

export function buildSignRequestFlowHints(
  status: string | null | undefined,
  signers: readonly SignRequestFlowSigner[],
): SignRequestFlowHints {
  const pending = signers.filter((signer) => ["pending", "otp_sent"].includes(signer.status ?? "")).length;
  const waitingApproval = signers.filter((signer) => signer.status === "waiting_approval").length;
  const waitingSigning = signers.filter((signer) => signer.status === "waiting_signing").length;
  const signed = signers.filter((signer) => ["signed", "completed"].includes(signer.status ?? "")).length;

  let flowState: SignRequestFlowHints["flow_state"] = "DRAFT";
  let nextAction: SignRequestFlowHints["next_action"] = "EDIT_AND_SEND";
  if (status === "completed") {
    flowState = "COMPLETED";
    nextAction = "VIEW_COMPLETED";
  } else if (status === "cancelled") {
    flowState = "CANCELLED";
    nextAction = "REVIEW_STATUS";
  } else if (status === "rejected") {
    flowState = "REJECTED";
    nextAction = "REVIEW_STATUS";
  } else if (status === "pending_approval" || waitingApproval > 0) {
    flowState = "AWAITING_APPROVAL";
    nextAction = "WAIT_FOR_APPROVAL";
  } else if (status === "pending" || status === "in_progress" || pending > 0 || waitingSigning > 0) {
    flowState = "AWAITING_SIGNATURES";
    nextAction = "WAIT_FOR_SIGNING";
  } else if (status === "generating_artifact") {
    flowState = "GENERATING_ARTIFACT";
    nextAction = "WAIT_FOR_ARTIFACT";
  } else if (status === "artifact_failed") {
    flowState = "ARTIFACT_FAILED";
    nextAction = "REVIEW_STATUS";
  }

  return {
    flow_state: flowState,
    next_action: nextAction,
    flow_counters: { total_signers: signers.length, pending, waiting_approval: waitingApproval, waiting_signing: waitingSigning, signed },
  };
}
