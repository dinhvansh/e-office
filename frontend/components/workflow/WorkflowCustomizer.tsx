'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Plus, Trash2, User } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface WorkflowStepInput {
  step_name: string;
  approver_type: string;
  approver_id: number | null;
  participant_role: 'approver' | 'signer';
  due_in_days: number;
  order: number;
}

interface WorkflowCustomizerProps {
  defaultWorkflowId?: number | null;
  initialSteps?: WorkflowStepInput[] | null;
  onCustomize: (steps: WorkflowStepInput[] | null) => void;
}

function normalizeTemplateStep(step: any, index: number): WorkflowStepInput {
  return {
    step_name: step.step_name || `Bước ${index + 1}`,
    approver_type: 'user',
    approver_id: step.approver_type === 'user' ? step.approver_id || null : null,
    participant_role: step.participant_role === 'signer' ? 'signer' : 'approver',
    due_in_days: step.due_in_days || 3,
    order: index + 1,
  };
}

function normalizeStep(step: Partial<WorkflowStepInput>, index: number): WorkflowStepInput {
  return {
    step_name: step.step_name || `Bước ${index + 1}`,
    approver_type: 'user',
    approver_id: typeof step.approver_id === 'number' && step.approver_id > 0 ? step.approver_id : null,
    participant_role: step.participant_role === 'signer' ? 'signer' : 'approver',
    due_in_days: typeof step.due_in_days === 'number' && step.due_in_days > 0 ? step.due_in_days : 3,
    order: typeof step.order === 'number' && step.order > 0 ? step.order : index + 1,
  };
}

function areStepsEqual(left: WorkflowStepInput[] | null | undefined, right: WorkflowStepInput[] | null | undefined) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

export function WorkflowCustomizer({ defaultWorkflowId, initialSteps, onCustomize }: WorkflowCustomizerProps) {
  const { fetchJson } = useAuth();
  const [steps, setSteps] = useState<WorkflowStepInput[]>([]);
  const stepsRef = useRef<WorkflowStepInput[]>([]);

  const syncSteps = (nextSteps: WorkflowStepInput[] | null, emit = true) => {
    const normalized = (nextSteps || []).map((step, index) => normalizeStep(step, index));
    stepsRef.current = normalized;
    setSteps(normalized);
    if (emit) {
      onCustomize(normalized.length ? normalized : null);
    }
  };

  const updateSteps = (updater: (current: WorkflowStepInput[]) => WorkflowStepInput[] | null) => {
    const nextSteps = updater(stepsRef.current);
    syncSteps(nextSteps);
  };

  const { data: workflowData, isLoading: isLoadingWorkflow } = useQuery({
    queryKey: ['workflow', defaultWorkflowId, 'customizer'],
    enabled: !!defaultWorkflowId,
    queryFn: async () => {
      const data: any = await fetchJson(`/workflows/${defaultWorkflowId}`);
      return data?.workflow || data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'active'],
    queryFn: () => fetchJson<any>('/users/active'),
  });

  const users = (usersData as any[]) || [];
  const templateSteps = useMemo(
    () => ((workflowData?.steps || []) as any[]).map((step, index) => normalizeTemplateStep(step, index)),
    [workflowData]
  );
  const restoredSteps = useMemo(
    () => (initialSteps?.length ? initialSteps.map((step, index) => normalizeStep(step, index)) : null),
    [initialSteps]
  );

  useEffect(() => {
    if (restoredSteps?.length) {
      if (!areStepsEqual(stepsRef.current, restoredSteps)) {
        syncSteps(restoredSteps, false);
      }
      return;
    }

    if (!templateSteps.length) {
      if (stepsRef.current.length > 0) {
        syncSteps(null);
      }
      return;
    }

    if (!areStepsEqual(stepsRef.current, templateSteps)) {
      syncSteps(templateSteps);
    }
  }, [restoredSteps, templateSteps]);

  const handleAddStep = () => {
    updateSteps((current) => [
      ...current,
      {
        step_name: `Bước ${current.length + 1}`,
        approver_type: 'user',
        approver_id: null,
        participant_role: 'approver',
        due_in_days: 3,
        order: current.length + 1,
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    updateSteps((current) =>
      current
        .filter((_, currentIndex) => currentIndex !== index)
        .map((step, currentIndex) => ({
          ...step,
          order: currentIndex + 1,
        }))
    );
  };

  const handleUpdateStep = (index: number, field: keyof WorkflowStepInput, value: any) => {
    updateSteps((current) =>
      current.map((step, currentIndex) =>
        currentIndex === index
          ? {
              ...step,
              [field]: field === 'approver_id' ? (typeof value === 'number' && value > 0 ? value : null) : value,
            }
          : step
      )
    );
  };

  const handleReset = () => {
    if (templateSteps.length) {
      syncSteps(templateSteps);
      return;
    }
    syncSteps(restoredSteps, false);
  };

  if (isLoadingWorkflow && !restoredSteps?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Đang tải workflow mặc định...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Quy trình đang áp dụng</h4>
          <p className="mt-1 text-xs text-slate-600">
            Đây là workflow đang được áp vào tài liệu này. Nếu loại văn bản cho phép tùy chỉnh, anh sửa trực tiếp ngay trên danh sách bước bên dưới.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleReset}>
          Dùng lại mặc định
        </Button>
      </div>

      {steps.some((step) => !step.approver_id) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Còn bước chưa chọn người phụ trách. Vui lòng chọn đủ người phê duyệt hoặc người ký trước khi sang editor.
        </div>
      )}

      <div className="space-y-3">
        {steps.map((step, index) => {
          const hasApprover = !!step.approver_id;

          return (
            <div
              key={`${defaultWorkflowId || 'custom'}-${index}`}
              className={`rounded-xl border p-4 ${hasApprover ? 'border-slate-200 bg-white' : 'border-amber-300 bg-amber-50'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {index + 1}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <input
                      type="text"
                      value={step.step_name}
                      onChange={(event) => handleUpdateStep(index, 'step_name', event.target.value)}
                      placeholder="Tên bước"
                      className="h-11 rounded-lg border border-slate-300 px-3 text-sm"
                    />

                    <select
                      value={step.participant_role}
                      onChange={(event) => handleUpdateStep(index, 'participant_role', event.target.value as 'approver' | 'signer')}
                      className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    >
                      <option value="approver">Người phê duyệt</option>
                      <option value="signer">Người ký</option>
                    </select>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                    <div>
                      <SearchableSelect
                        options={users.map((user: any) => ({
                          value: user.id,
                          label: `${user.full_name || user.email}${user.full_name ? ` (${user.email})` : ''}`,
                        }))}
                        value={step.approver_id || ''}
                        onChange={(value) =>
                          handleUpdateStep(index, 'approver_id', typeof value === 'string' ? parseInt(value, 10) : value)
                        }
                        placeholder={step.participant_role === 'signer' ? '-- Chọn người ký --' : '-- Chọn người phê duyệt --'}
                      />
                      {!hasApprover && (
                        <p className="mt-1 text-xs text-amber-700">
                          Chưa chọn {step.participant_role === 'signer' ? 'người ký' : 'người phê duyệt'} cho bước này.
                        </p>
                      )}
                    </div>

                    <input
                      type="number"
                      value={step.due_in_days}
                      onChange={(event) => handleUpdateStep(index, 'due_in_days', parseInt(event.target.value, 10) || 1)}
                      min="1"
                      max="365"
                      className="h-11 rounded-lg border border-slate-300 px-3 text-sm"
                    />

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>ngày xử lý</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>{step.participant_role === 'signer' ? 'Bước ký điện tử' : 'Bước phê duyệt'}</span>
                    </div>
                  </div>
                </div>

                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveStep(index)} className="flex-shrink-0">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={handleAddStep} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Thêm bước
      </Button>
    </div>
  );
}
