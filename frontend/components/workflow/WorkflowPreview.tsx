'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { CheckCircle, Clock, User } from 'lucide-react';

interface WorkflowPreviewProps {
  workflowId: number;
}

export function WorkflowPreview({ workflowId }: WorkflowPreviewProps) {
  const { fetchJson } = useAuth();

  const { data: workflowData, isLoading } = useQuery({
    queryKey: ['workflow', workflowId, 'v3'], // v3 - force fresh data
    queryFn: async () => {
      console.log('🔍 WorkflowPreview - Fetching workflow ID:', workflowId);
      const data: any = await fetchJson(`/workflows/${workflowId}`);
      console.log('🔍 WorkflowPreview - Raw API Response:', JSON.stringify(data, null, 2));
      
      // Handle nested response structure
      const workflow = data?.workflow || data;
      console.log('🔍 WorkflowPreview - Parsed workflow:', workflow);
      console.log('🔍 WorkflowPreview - Workflow name:', workflow?.name);
      console.log('🔍 WorkflowPreview - Steps count:', workflow?.steps?.length);
      
      if (workflow?.steps) {
        console.log('🔍 WorkflowPreview - Steps array:', workflow.steps);
        workflow.steps.forEach((step: any, i: number) => {
          console.log(`\n🔍 Step ${i + 1} Details:`);
          console.log('   - step_name:', step.step_name);
          console.log('   - approver_type:', step.approver_type);
          console.log('   - approver_name:', step.approver_name);
          console.log('   - approver_email:', step.approver_email);
          console.log('   - Has approver_name?', !!step.approver_name);
          console.log('   - Has approver_email?', !!step.approver_email);
          console.log('   - Will render approver info?', !!(step.approver_name && step.approver_email));
        });
      }
      return workflow;
    },
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">Đang tải workflow...</p>
      </div>
    );
  }

  if (!workflowData) {
    return null;
  }

  const steps = workflowData.steps || [];
  
  // Debug: Log workflow data
  console.log('🔍 WorkflowPreview - workflowData:', workflowData);
  console.log('🔍 WorkflowPreview - steps:', steps);
  if (steps.length > 0) {
    console.log('🔍 WorkflowPreview - first step:', steps[0]);
    console.log('🔍 WorkflowPreview - has approver_name?', !!steps[0].approver_name);
    console.log('🔍 WorkflowPreview - has approver_email?', !!steps[0].approver_email);
  }

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
        {steps.map((step: any, index: number) => {
          // Debug each step during render
          console.log(`\n🎨 Rendering Step ${index + 1}:`, step.step_name);
          console.log('   - approver_name:', step.approver_name, '(type:', typeof step.approver_name, ')');
          console.log('   - approver_email:', step.approver_email, '(type:', typeof step.approver_email, ')');
          console.log('   - Condition check:', !!(step.approver_name && step.approver_email));
          
          return (
            <div
              key={step.id}
              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{step.step_name}</p>
                
                {/* Debug info - TEMPORARY */}
                <div className="mt-1 p-1 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <p>🐛 Debug: name={step.approver_name || 'null'}, email={step.approver_email || 'null'}</p>
                  <p>🐛 Condition: {step.approver_name && step.approver_email ? 'TRUE ✅' : 'FALSE ❌'}</p>
                </div>
                
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
              {step.is_required && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
