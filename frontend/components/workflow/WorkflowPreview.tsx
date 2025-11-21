'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { CheckCircle, Clock, User } from 'lucide-react';

interface WorkflowPreviewProps {
  workflowId: number;
}

export function WorkflowPreview({ workflowId }: WorkflowPreviewProps) {
  const { fetchJson } = useAuth();

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => fetchJson<any>(`/workflows/${workflowId}`),
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">Đang tải workflow...</p>
      </div>
    );
  }

  if (!workflow) {
    return null;
  }

  const steps = workflow.workflow?.steps || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          📋 Quy trình phê duyệt (Chế độ: Strict)
        </h4>
        <span className="text-xs text-gray-500">
          {steps.length} bước
        </span>
      </div>

      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
        <p className="text-xs text-orange-700 font-medium">
          ⚠️ Quy trình này bắt buộc, không thể thay đổi
        </p>
      </div>

      <div className="space-y-2">
        {steps.map((step: any, index: number) => (
          <div
            key={step.id}
            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{step.step_name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <User className="w-3 h-3" />
                <span>
                  {step.approver_type === 'user' && 'Người dùng'}
                  {step.approver_type === 'role' && 'Vai trò'}
                  {step.approver_type === 'department' && 'Phòng ban'}
                  {step.approver_type === 'manager' && 'Quản lý'}
                </span>
                <Clock className="w-3 h-3 ml-2" />
                <span>{step.due_in_days} ngày</span>
              </div>
            </div>
            {step.is_required && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
