export function canHardDeleteDocumentStatus(status: string | null | undefined): boolean {
  return status === "draft" || status === "cancelled";
}

export function canCancelDocumentStatus(status: string | null | undefined): boolean {
  return ["draft", "pending_approval", "pending_signature", "in_progress", "artifact_failed"].includes(status ?? "");
}
