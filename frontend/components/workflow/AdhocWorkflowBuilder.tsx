'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface AdhocWorkflowBuilderProps {
  onBuild: (steps: any[] | null) => void;
}

export function AdhocWorkflowBuilder({ onBuild }: AdhocWorkflowBuilderProps) {
  const { fetchJson } = useAuth();
  const [steps, setSteps] = useState<any[]>([
    {
      approver_user_id: '',
      due_in_days: 3,
    },
  ]);

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchJson<any>('/users'),
  });

  const users = (usersData as any) || [];

  useEffect(() => {
    onBuild(steps.length > 0 ? steps : null);
  }, [steps]);

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        approver_user_id: users[0]?.id || '',
        due_in_days: 3,
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const handleUpdateStep = (index: number, field: string, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          💡 Tạo quy trình phê duyệt (Chế độ: Ad-hoc)
        </h4>
        <span className="text-xs text-gray-500">
          {steps.length} bước
        </span>
      </div>

      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-purple-700 font-medium">
            Loại văn bản này yêu cầu bạn tự tạo quy trình phê duyệt. Tối thiểu 1 bước, tối đa 10 bước.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-semibold">
              {index + 1}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Người phê duyệt</label>
                  <SearchableSelect
                    options={users.map((user: any) => ({
                      value: user.id,
                      label: `${user.full_name || user.email}${user.full_name ? ` (${user.email})` : ''}`,
                    }))}
                    value={step.approver_user_id}
                    onChange={(value) => handleUpdateStep(index, 'approver_user_id', value)}
                    placeholder="-- Chọn người phê duyệt --"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs text-gray-600 mb-1">Thời hạn</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={step.due_in_days}
                      onChange={(e) => handleUpdateStep(index, 'due_in_days', parseInt(e.target.value))}
                      min="1"
                      max="365"
                      className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-500">ngày</span>
                  </div>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveStep(index)}
              disabled={steps.length === 1}
              className="flex-shrink-0"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddStep}
        disabled={steps.length >= 10}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-1" />
        Thêm bước {steps.length >= 10 && '(Tối đa 10 bước)'}
      </Button>

      {steps.length === 0 && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-xs text-red-700 font-medium">
            ⚠️ Phải có ít nhất 1 bước phê duyệt
          </p>
        </div>
      )}
    </div>
  );
}
