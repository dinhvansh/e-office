export type ApprovalCompletionMode = "all" | "any_one" | "min_n";

export function isApprovalStepComplete(
  actions: Array<string | null | undefined>,
  mode: ApprovalCompletionMode,
  minRequired?: number | null,
): boolean {
  const approved = actions.filter((action) => action === "approved").length;
  if (mode === "any_one") return approved >= 1;
  if (mode === "min_n") return approved >= Math.max(1, minRequired ?? 1);
  return actions.length > 0 && actions.every((action) => action === "approved");
}
