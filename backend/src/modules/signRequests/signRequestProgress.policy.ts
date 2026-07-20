export type ProgressParticipant = { status?: string | null };
export type ProgressApproval = { action?: string | null };

export type SignRequestProgress = {
  total: number;
  signed: number;
  rejected: number;
  pending: number;
  percentage: number;
  kind: "approval" | "signing";
};

export function buildSignRequestProgress(
  signers: readonly ProgressParticipant[],
  approvals: readonly ProgressApproval[] = [],
): SignRequestProgress {
  const useSigningProgress = signers.length > 0;
  const total = useSigningProgress ? signers.length : approvals.length;
  const signed = useSigningProgress
    ? signers.filter((item) => ["signed", "completed"].includes(item.status || "")).length
    : approvals.filter((item) => item.action === "approved").length;
  const rejected = useSigningProgress
    ? signers.filter((item) => item.status === "rejected").length
    : approvals.filter((item) => item.action === "rejected").length;

  return {
    total,
    signed,
    rejected,
    pending: Math.max(0, total - signed - rejected),
    percentage: total > 0 ? Math.round((signed / total) * 100) : 0,
    kind: useSigningProgress ? "signing" : "approval",
  };
}
