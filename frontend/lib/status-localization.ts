import type { TranslationKey, Translator } from "@/i18n";

export type StatusVariant = "success" | "pending" | "warning" | "danger" | "info" | "default";

const documentStatuses: Record<string, { key: TranslationKey; variant: StatusVariant }> = {
  draft: { key: "documents.status.draft", variant: "default" },
  pending: { key: "documents.status.pending", variant: "pending" },
  pending_approval: { key: "documents.status.pendingApproval", variant: "pending" },
  approved: { key: "documents.status.approved", variant: "success" },
  pending_signature: { key: "documents.status.pendingSignature", variant: "info" },
  in_progress: { key: "documents.status.inProgress", variant: "pending" },
  signing: { key: "documents.status.signing", variant: "info" },
  generating_artifact: { key: "documents.status.generatingArtifact", variant: "info" },
  artifact_failed: { key: "documents.status.artifactFailed", variant: "danger" },
  completed: { key: "documents.status.completed", variant: "success" },
  active: { key: "documents.status.active", variant: "success" },
  rejected: { key: "documents.status.rejected", variant: "danger" },
  cancelled: { key: "documents.status.cancelled", variant: "danger" },
  archived: { key: "documents.status.archived", variant: "warning" },
};

export function getDocumentStatusMeta(status: string | null | undefined, t: Translator) {
  const normalized = String(status || "draft").toLowerCase();
  const meta = documentStatuses[normalized] ?? documentStatuses.draft;
  return { label: t(meta.key), variant: meta.variant };
}

export function getSignRequestStatusMeta(
  input: { status?: string | null; flowState?: string | null; rejected?: number; percentage?: number },
  t: Translator,
) {
  const status = String(input.status || "").toLowerCase();
  const flow = String(input.flowState || "").toUpperCase();
  if (flow === "CANCELLED" || status === "cancelled") return { label: t("signRequests.status.cancelled"), variant: "cancelled" as const };
  if (flow === "REJECTED" || (input.rejected ?? 0) > 0) return { label: t("signRequests.status.rejected"), variant: "rejected" as const };
  if (flow === "COMPLETED" || status === "completed" || input.percentage === 100) return { label: t("signRequests.status.completed"), variant: "completed" as const };
  if (flow === "AWAITING_APPROVAL" || status === "pending_approval") return { label: t("signRequests.status.pendingApproval"), variant: "pendingApproval" as const };
  if (flow === "AWAITING_SIGNATURES" || ["pending", "in_progress"].includes(status)) return { label: t("signRequests.status.pendingSignature"), variant: "pendingSignature" as const };
  if (flow === "GENERATING_ARTIFACT" || status === "generating_artifact") return { label: t("signRequests.status.generatingArtifact"), variant: "generating" as const };
  if (flow === "ARTIFACT_FAILED" || status === "artifact_failed") return { label: t("signRequests.status.artifactFailed"), variant: "failed" as const };
  return { label: t("signRequests.status.draft"), variant: "draft" as const };
}

const approvalStatuses: Record<string, TranslationKey> = {
  pending: "approvals.status.pending",
  waiting: "approvals.status.waiting",
  approved: "approvals.status.approved",
  rejected: "approvals.status.rejected",
  cancelled: "approvals.status.cancelled",
  request_info: "approvals.status.requestInfo",
  info_requested: "approvals.status.requestInfo",
};

export function getApprovalStatusLabel(status: string | null | undefined, t: Translator): string {
  return t(approvalStatuses[String(status || "pending").toLowerCase()] ?? "approvals.status.pending");
}
