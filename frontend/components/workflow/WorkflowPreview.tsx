'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, User } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
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
    steps?: WorkflowStep[];
  };
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
    cacheTime: 0,
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{workflowPreviewLabels.title}</h4>
        <span className="text-xs text-gray-500">{workflowPreviewLabels.steps(steps.length)}</span>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{step.step_name}</p>

              {step.approver_name && step.approver_email ? (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-semibold">
                      {step.approver_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 truncate">{step.approver_name}</p>
                      <p className="text-xs text-blue-600 truncate">{step.approver_email}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-500">{workflowPreviewLabels.missingApprover}</p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <User className="w-3 h-3" />
                <span>
                  {workflowPreviewLabels.approverTypes[step.approver_type]}
                </span>
                <Clock className="w-3 h-3 ml-2" />
                <span>{workflowPreviewLabels.dueInDays(step.due_in_days)}</span>
              </div>
            </div>
            {step.is_required && <CheckCircle className="w-4 h-4 text-green-500" />}
          </div>
        ))}
      </div>
    </div>
  );
}
