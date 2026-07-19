'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowDown, CheckCircle, Clock, User, UsersRound } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { approvalModeContent, normalizeApprovalMode, type ApprovalMode } from '@/lib/workflow-approval-mode';
import { workflowPreviewLabels } from '@/lib/workflow-preview-labels';

interface WorkflowPreviewProps {
  workflowId: number;
}

type WorkflowStep = {
  id: number;
  step_name: string;
  approver_type: 'user' | 'role' | 'department' | 'manager';
  approver_name?: string | null;
  approver_email?: string | null;
  due_in_days: number;
  is_required: boolean;
};

type WorkflowResponse = {
  workflow?: {
    approval_mode?: ApprovalMode | null;
    steps?: WorkflowStep[];
  };
  approval_mode?: ApprovalMode | null;
  steps?: WorkflowStep[];
};

export function WorkflowPreview({ workflowId }: WorkflowPreviewProps) {
  const { fetchJson } = useAuth();

  const { data: workflowData, isLoading } = useQuery({
    queryKey: ['workflow', workflowId, 'preview'],
    queryFn: async () => {
      const data = await fetchJson<WorkflowResponse>(`/workflows/${workflowId}`);
      return data?.workflow ?? data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">{workflowPreviewLabels.loading}</p>
      </div>
    );
  }

  if (!workflowData) {
    return null;
  }

  const steps = workflowData.steps || [];
  const approvalMode = normalizeApprovalMode(workflowData.approval_mode);
  const modeContent = approvalModeContent[approvalMode];

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200">{workflowPreviewLabels.title}</h4>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={approvalMode === 'parallel'
              ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200'
              : 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200'}
          >
            {approvalMode === 'parallel' && <UsersRound className="mr-1 h-3 w-3" />}
            {modeContent.label}
          </Badge>
          <span className="text-xs text-gray-500 dark:text-slate-400">{workflowPreviewLabels.steps(steps.length)}</span>
        </div>
      </div>

      <p className="text-xs text-gray-600 dark:text-slate-300">{modeContent.previewHint}</p>

      <div className={approvalMode === 'parallel' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-0'}>
        {steps.map((step, index) => {
          const stepCard = (
            <div
              className={`flex h-full items-start gap-3 rounded-lg border bg-white p-3 transition-colors dark:bg-slate-900 ${
                approvalMode === 'parallel'
                  ? 'border-violet-200 hover:border-violet-400 dark:border-violet-800'
                  : 'border-gray-200 hover:border-blue-300 dark:border-slate-700'
              }`}
            >
              <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                approvalMode === 'parallel'
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200'
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-200'
              }`}>
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{step.step_name}</p>
                  {approvalMode === 'parallel' && (
                    <span className="text-[11px] font-medium text-violet-600 dark:text-violet-300">Đồng thời</span>
                  )}
                </div>

                {step.approver_name && step.approver_email ? (
                  <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 dark:border-blue-900 dark:bg-blue-950/50">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        {step.approver_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-blue-900 dark:text-blue-100">{step.approver_name}</p>
                        <p className="truncate text-xs text-blue-600 dark:text-blue-300">{step.approver_email}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs text-gray-500 dark:text-slate-400">{workflowPreviewLabels.missingApprover}</p>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <User className="h-3 w-3" />
                  <span>{workflowPreviewLabels.approverTypes[step.approver_type]}</span>
                  <Clock className="ml-2 h-3 w-3" />
                  <span>{workflowPreviewLabels.dueInDays(step.due_in_days)}</span>
                </div>
              </div>
              {step.is_required && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          );

          if (approvalMode === 'parallel') {
            return <div key={step.id}>{stepCard}</div>;
          }

          return (
            <div key={step.id}>
              {stepCard}
              {index < steps.length - 1 && (
                <div className="flex h-7 items-center justify-center text-blue-500" aria-hidden="true">
                  <ArrowDown className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
