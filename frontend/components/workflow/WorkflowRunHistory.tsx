"use client";

import { History } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";

type ApprovalHistory = {
  id: number;
  step_order: number;
  step_name?: string | null;
  actor?: string | null;
  action?: string | null;
  acted_at?: string | null;
  comment?: string | null;
};

export type WorkflowRunHistoryItem = {
  id: number;
  run_number: number;
  status: string;
  workflow_name: string;
  started_at: string;
  completed_at?: string | null;
  approvals: ApprovalHistory[];
};

const statusKey = (status?: string | null) => {
  switch (status) {
    case "completed": return "documents.workflowHistory.completed" as const;
    case "rejected": return "documents.workflowHistory.rejected" as const;
    case "cancelled":
    case "superseded": return "documents.workflowHistory.cancelled" as const;
    case "in_progress": return "documents.workflowHistory.inProgress" as const;
    case "approved": return "documents.workflowHistory.approved" as const;
    default: return "documents.workflowHistory.pending" as const;
  }
};

export function WorkflowRunHistory({ runs }: { runs?: WorkflowRunHistoryItem[] | null }) {
  const { locale, t } = useI18n();
  if (!runs?.length) return null;
  const dateLocale = locale === "en" ? "en-US" : "vi-VN";

  return (
    <section className="rounded-lg border bg-white shadow-sm" aria-labelledby="workflow-run-history-heading">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <History className="h-4 w-4" aria-hidden="true" />
        <h2 id="workflow-run-history-heading" className="text-sm font-semibold text-slate-900">
          {t("documents.workflowHistory.title")}
        </h2>
      </div>
      <div className="space-y-3 p-4">
        {runs.map((run) => (
          <article key={run.id} className="rounded-md border p-3" data-testid={`workflow-run-${run.run_number}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{t("documents.workflowHistory.run", { number: run.run_number })}</p>
                <p className="text-xs text-muted-foreground">{run.workflow_name}</p>
              </div>
              <Badge variant="outline">{t(statusKey(run.status))}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("documents.workflowHistory.approvals", { count: run.approvals.length })} · {new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(run.started_at))}
            </p>
            {run.approvals.length === 0 ? (
              <p className="mt-2 text-xs italic text-muted-foreground">{t("documents.workflowHistory.noApprovals")}</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {[...run.approvals].sort((a, b) => a.step_order - b.step_order).map((approval) => (
                  <li key={approval.id} className="border-l-2 border-slate-200 pl-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-medium">{approval.step_order}. {approval.step_name || approval.actor || "—"}</span>
                      <span className="text-muted-foreground">{t(statusKey(approval.action))}</span>
                    </div>
                    {approval.actor ? <p className="mt-0.5 text-muted-foreground">{approval.actor}</p> : null}
                    {approval.acted_at ? <time className="text-muted-foreground" dateTime={approval.acted_at}>{new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(approval.acted_at))}</time> : null}
                    {approval.comment ? <p className="mt-1 break-words text-muted-foreground">{approval.comment}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
