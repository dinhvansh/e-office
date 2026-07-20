export type DocumentDeleteDisposition = "hard_delete" | "archive" | "deny";

const ARCHIVABLE_DOCUMENT_STATUSES = new Set(["rejected", "cancelled"]);

export function canHardDeleteDocumentStatus(status: string | null | undefined): boolean {
  return status === "draft";
}

export function canArchiveDocumentStatus(status: string | null | undefined): boolean {
  return ARCHIVABLE_DOCUMENT_STATUSES.has(status ?? "");
}

export function getDocumentDeleteDisposition(
  status: string | null | undefined,
  hasLifecycleHistory: boolean,
): DocumentDeleteDisposition {
  if (status === "draft") return hasLifecycleHistory ? "deny" : "hard_delete";
  if (canArchiveDocumentStatus(status)) return "archive";
  return "deny";
}

export function canCancelDocumentStatus(status: string | null | undefined): boolean {
  return ["draft", "pending_approval", "pending_signature", "in_progress", "artifact_failed"].includes(status ?? "");
}
