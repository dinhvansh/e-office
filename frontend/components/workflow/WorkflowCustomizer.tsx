'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { Plus, Trash2, Clock, User, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface WorkflowCustomizerProps {
  defaultWorkflowId: number;
  onCustomize: (steps: any[] | null) => void;
}

export function WorkflowCustomizer({ defaultWorkflowId, onCustomize }: WorkflowCustomizerProps) {
  const { fetchJson } = useAuth();
  const [useDefault, setUseDefault] = useState(true);
  const [customSteps, setCustomSteps] = useState<any[]>([]);

  const { data: workflowData } = useQuery({
    queryKey: ['workflow', defaultWorkflowId],
    queryFn: async () => {
      const data: any = await fetchJson(`/workflows/${defaultWorkflowId}`);
      // Handle nested response structure
      return data?.workflow || data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchJson<any>('/users'),
  });

  const users = (usersData as any) || [];
  const defaultSteps = workflowData?.steps || [];

  useEffect(() => {
    if (useDefault) {
      onCustomize(null);
    } else {
      onCustomize(customSteps.length > 0 ? customSteps : null);
    }
  }, [useDefault, customSteps]);

  const handleAddStep = () => {
    setCustomSteps([
      ...customSteps,
      {
        step_name: `Bước ${customSteps.length + 1}`,
        approver_type: 'user',
        approver_id: users[0]?.id || '',
        due_in_days: 3,
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    setCustomSteps(customSteps.filter((_, i) => i !== index));
  };

  const handleUpdateStep = (index: number, field: string, value: any) => {
    const updated = [...customSteps];
    updated[index] = { ...updated[index], [field]: value };
    setCustomSteps(updated);
  };

  const handleReset = () => {
    setUseDefault(true);
    setCustomSteps([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          🔧 Quy trình phê duyệt (Chế độ: Flexible)
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={useDefault}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Dùng mặc định
        </Button>
      </div>

      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-xs text-green-700 font-medium">
          ✅ Bạn có thể tùy chỉnh quy trình hoặc dùng mặc định
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={useDefault}
            onChange={() => setUseDefault(true)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">Dùng quy trình mặc định</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!useDefault}
            onChange={() => {
              setUseDefault(false);
              if (customSteps.length === 0) {
                // Initialize with default steps
                setCustomSteps(
                  defaultSteps.map((step: any) => ({
                    step_name: step.step_name,
                    approver_type: step.approver_type,
                    approver_id: step.approver_id,
                    due_in_days: step.due_in_days,
                  }))
                );
              }
            }}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">Tùy chỉnh</span>
        </label>
      </div>

      {/* Show default steps */}
      {useDefault && (
        <div className="space-y-2">
          {defaultSteps.map((step: any, index: number) => (
            <div
              key={step.id}
              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{step.step_name}</p>
                
                {/* Approver Info */}
                {step.approver_name && step.approver_email ? (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-semibold">
                        {step.approver_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900 truncate">
                          {step.approver_name}
                        </p>
                        <p className="text-xs text-blue-600 truncate">
                          {step.approver_email}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs text-gray-500">
                      ⚠️ Chưa có thông tin người phê duyệt
                    </p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
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
            </div>
          ))}
        </div>
      )}

      {/* Custom steps editor */}
      {!useDefault && (
        <div className="space-y-2">
          {customSteps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={step.step_name}
                  onChange={(e) => handleUpdateStep(index, 'step_name', e.target.value)}
                  placeholder="Tên bước"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={users.map((user: any) => ({
                        value: user.id,
                        label: `${user.full_name || user.email}${user.full_name ? ` (${user.email})` : ''}`,
                      }))}
                      value={step.approver_id}
                      onChange={(value) => handleUpdateStep(index, 'approver_id', value)}
                      placeholder="-- Chọn người phê duyệt --"
                    />
                  </div>
                  <input
                    type="number"
                    value={step.due_in_days}
                    onChange={(e) => handleUpdateStep(index, 'due_in_days', parseInt(e.target.value))}
                    min="1"
                    max="365"
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-500 self-center">ngày</span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveStep(index)}
                className="flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Thêm bước
          </Button>
        </div>
      )}
    </div>
  );
}
