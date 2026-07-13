export type SignRequestFlowSigner = {
  status: string | null;
};

export type SignRequestFlowHints = {
  flow_state: "DRAFT" | "COMPLETED" | "CANCELLED" | "REJECTED" | "AWAITING_APPROVAL" | "AWAITING_SIGNATURES";
  next_action: "EDIT_AND_SEND" | "VIEW_COMPLETED" | "REVIEW_STATUS" | "WAIT_FOR_APPROVAL" | "WAIT_FOR_SIGNING";
  flow_counters: {
    total_signers: number;
    pending: number;
    waiting_approval: number;
    waiting_signing: number;
    signed: number;
  };
};

export function isEditableSignRequestStatus(status: string | null | undefined): boolean {
  return status === "draft" || status === "rejected";
}

export function canSendSignRequestStatus(status: string | null | undefined): boolean {
  return status !== "completed" && status !== "cancelled";
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
  }

  return {
    flow_state: flowState,
    next_action: nextAction,
    flow_counters: { total_signers: signers.length, pending, waiting_approval: waitingApproval, waiting_signing: waitingSigning, signed },
  };
}
