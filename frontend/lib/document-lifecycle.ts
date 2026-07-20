export type LifecycleActions = {
  canDelete: boolean;
  canArchive: boolean;
  canCancel: boolean;
};

const ACTIVE_STATUSES = new Set([
  "pending",
  "pending_approval",
  "pending_signature",
  "in_progress",
  "signing",
  "generating_artifact",
  "artifact_failed",
]);

const normalize = (status: string | null | undefined) => (status || "").toLowerCase();

export function getDocumentLifecycleActions(status: string | null | undefined): LifecycleActions {
  const normalized = normalize(status);
  return {
    canDelete: normalized === "draft",
    canArchive: normalized === "rejected" || normalized === "cancelled",
    canCancel: ACTIVE_STATUSES.has(normalized),
  };
}

export function getSignRequestLifecycleActions(
  status: string | null | undefined,
  flowState?: string | null,
): LifecycleActions {
  const normalizedStatus = normalize(status);
  const normalizedFlow = normalize(flowState);
  if ([normalizedStatus, normalizedFlow].some((value) => value === "completed" || value === "archived")) {
    return { canDelete: false, canArchive: false, canCancel: false };
  }
  const canArchive = [normalizedStatus, normalizedFlow].some((value) => value === "rejected" || value === "cancelled");
  return {
    canDelete: !canArchive && normalizedStatus === "draft" && (!normalizedFlow || normalizedFlow === "draft"),
    canArchive,
    canCancel: !canArchive && (
      ACTIVE_STATUSES.has(normalizedStatus)
      || ["awaiting_approval", "awaiting_signatures", "generating_artifact", "artifact_failed"].includes(normalizedFlow)
    ),
  };
}
