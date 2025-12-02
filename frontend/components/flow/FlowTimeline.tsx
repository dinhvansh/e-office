'use client';

import { CheckCircle, Clock, XCircle, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface FlowStep {
  id: string;
  type: 'approval' | 'signing';
  order: number;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'signed' | 'info_requested';
  started_at?: string;
  completed_at?: string;
  comment?: string;
  signer_kind?: 'internal' | 'external';
}

interface FlowTimelineProps {
  steps: FlowStep[];
  canApprove: boolean;
  canSign: boolean;
}

export function FlowTimeline({ steps, canApprove, canSign }: FlowTimelineProps) {
  const router = useRouter();

  const getStatusIcon = (status: FlowStep['status']) => {
    switch (status) {
      case 'approved':
      case 'signed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'info_requested':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: FlowStep['status']) => {
    switch (status) {
      case 'approved':
      case 'signed':
        return 'border-green-600 bg-green-50';
      case 'rejected':
        return 'border-red-600 bg-red-50';
      case 'info_requested':
        return 'border-yellow-600 bg-yellow-50';
      case 'in_progress':
        return 'border-blue-600 bg-blue-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getStatusText = (status: FlowStep['status']) => {
    switch (status) {
      case 'approved':
        return 'Đã phê duyệt';
      case 'signed':
        return 'Đã ký';
      case 'rejected':
        return 'Đã từ chối';
      case 'info_requested':
        return 'Yêu cầu bổ sung';
      case 'in_progress':
        return 'Đang xử lý';
      default:
        return 'Chờ xử lý';
    }
  };

  const getTypeLabel = (type: FlowStep['type']) => {
    return type === 'approval' ? 'Phê duyệt' : 'Ký điện tử';
  };

  const handleStepAction = (step: FlowStep) => {
    if (step.type === 'approval' && canApprove) {
      // Navigate to approval detail page
      const approvalId = step.id.replace('approval-', '');
      router.push(`/approvals/${approvalId}`);
    } else if (step.type === 'signing' && canSign) {
      // Navigate to signing page
      const signerId = step.id.replace('signing-', '');
      // Determine if internal or external signing
      if (step.signer_kind === 'internal') {
        router.push(`/my-tasks`); // Or specific internal signing page
      } else {
        router.push(`/my-tasks`); // External signers use token-based URL
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-lg font-semibold mb-4">Quy trình</h2>
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCurrentUserStep = 
            (step.type === 'approval' && canApprove && step.status === 'pending') ||
            (step.type === 'signing' && canSign && step.status === 'pending');

          return (
            <div key={step.id} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
              )}

              {/* Step Card */}
              <div
                className={`relative border-2 rounded-lg p-4 transition-all ${getStatusColor(
                  step.status
                )} ${isCurrentUserStep ? 'ring-2 ring-blue-400' : ''}`}
              >
                {/* Order Badge */}
                <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-sm font-semibold">
                  {step.order}
                </div>

                {/* Step Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(step.status)}
                    <div>
                      <div className="font-medium text-sm">
                        {getTypeLabel(step.type)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getStatusText(step.status)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                {step.user && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{step.user.name}</div>
                      <div className="text-xs text-gray-500">{step.user.email}</div>
                    </div>
                  </div>
                )}

                {/* Comment */}
                {step.comment && (
                  <div className="mt-2 p-2 bg-white rounded text-sm text-gray-600">
                    💬 {step.comment}
                  </div>
                )}

                {/* Timestamps */}
                {step.completed_at && (
                  <div className="mt-2 text-xs text-gray-500">
                    Hoàn thành: {new Date(step.completed_at).toLocaleString('vi-VN')}
                  </div>
                )}

                {/* Action Button */}
                {isCurrentUserStep && (
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => handleStepAction(step)}
                  >
                    {step.type === 'approval' ? 'Phê duyệt ngay' : 'Ký ngay'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
