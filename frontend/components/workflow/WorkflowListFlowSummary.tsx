"use client";

import { ArrowRight, Eye, ListTree, UsersRound } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approvalModeTranslationKeys, normalizeApprovalMode, type ApprovalMode } from "@/lib/workflow-approval-mode";

type FlowStep = {
  id: number;
  label: string;
};

type WorkflowListFlowSummaryProps = {
  workflowId: number;
  workflowName: string;
  approvalMode?: ApprovalMode | null;
  steps: FlowStep[];
  documentTypeName?: string | null;
  onViewFlow: () => void;
};

const MAX_VISIBLE_STEPS = 5;

export function WorkflowListFlowSummary({
  workflowId,
  workflowName,
  approvalMode,
  steps,
  documentTypeName,
  onViewFlow,
}: WorkflowListFlowSummaryProps) {
  const { t } = useI18n();
  const mode = normalizeApprovalMode(approvalMode);
  const modeKeys = approvalModeTranslationKeys[mode];
  const visibleSteps = steps.slice(0, MAX_VISIBLE_STEPS);
  const remainingSteps = Math.max(0, steps.length - visibleSteps.length);
  const ModeIcon = mode === "parallel" ? UsersRound : ListTree;

  return (
    <div className="min-w-0 space-y-2" data-testid={`workflow-flow-${workflowId}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={mode === "parallel"
            ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200"
            : "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200"}
        >
          <ModeIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {t(modeKeys.label)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {t("workflow.flow.stepCount", { count: steps.length })}
        </span>
        {documentTypeName && (
          <span className="max-w-48 truncate text-xs text-muted-foreground" title={documentTypeName}>
            {t("workflow.flow.documentType", { name: documentTypeName })}
          </span>
        )}
      </div>

      {steps.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">{t("workflow.flow.empty")}</p>
      ) : mode === "parallel" ? (
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300">
            <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
            {t("workflow.flow.simultaneous")}
          </span>
          <div className="flex flex-wrap gap-1.5" data-testid="parallel-flow">
            {visibleSteps.map((step) => (
              <span
                key={step.id}
                className="max-w-40 truncate rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100"
                title={step.label}
              >
                {step.label}
              </span>
            ))}
            {remainingSteps > 0 && (
              <span className="rounded-md border border-dashed border-violet-300 px-2 py-1 text-xs text-violet-700">
                +{remainingSteps}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex max-w-full items-center gap-1 overflow-hidden" data-testid="sequential-flow">
          {visibleSteps.map((step, index) => (
            <div key={step.id} className="contents">
              <span
                className="min-w-0 max-w-32 truncate rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100"
                title={`${index + 1}. ${step.label}`}
              >
                <span className="mr-1 font-semibold">{index + 1}</span>
                {step.label}
              </span>
              {index < visibleSteps.length - 1 && (
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-blue-500"
                  aria-hidden="true"
                  data-testid="sequential-connector"
                />
              )}
            </div>
          ))}
          {remainingSteps > 0 && (
            <span className="shrink-0 rounded-md border border-dashed border-blue-300 px-2 py-1 text-xs text-blue-700">
              +{remainingSteps}
            </span>
          )}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={(event) => {
          event.stopPropagation();
          onViewFlow();
        }}
        aria-label={t("workflow.flow.viewFor", { name: workflowName })}
      >
        <Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        {t("workflow.flow.view")}
      </Button>
    </div>
  );
}
