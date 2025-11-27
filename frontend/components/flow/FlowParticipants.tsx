'use client';

import { User, CheckCircle, Clock, XCircle } from 'lucide-react';

interface FlowStep {
  id: string;
  type: 'approval' | 'signing';
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'signed' | 'info_requested';
}

interface FlowParticipantsProps {
  steps: FlowStep[];
}

export function FlowParticipants({ steps }: FlowParticipantsProps) {
  const getStatusIcon = (status: FlowStep['status']) => {
    switch (status) {
      case 'approved':
      case 'signed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: FlowStep['status']) => {
    switch (status) {
      case 'approved':
        return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Đã duyệt</span>;
      case 'signed':
        return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Đã ký</span>;
      case 'rejected':
        return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Từ chối</span>;
      case 'in_progress':
        return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Đang xử lý</span>;
      default:
        return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Chờ xử lý</span>;
    }
  };

  const getRoleLabel = (type: FlowStep['type']) => {
    return type === 'approval' ? 'Người phê duyệt' : 'Người ký';
  };

  // Group by type
  const approvers = steps.filter(s => s.type === 'approval');
  const signers = steps.filter(s => s.type === 'signing');

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto">
      {/* Approvers */}
      {approvers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Người phê duyệt ({approvers.length})
          </h3>
          <div className="space-y-3">
            {approvers.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {step.user?.name || 'N/A'}
                    </p>
                    {getStatusIcon(step.status)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {step.user?.email || 'N/A'}
                  </p>
                  <div className="mt-2">
                    {getStatusBadge(step.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signers */}
      {signers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Người ký ({signers.length})
          </h3>
          <div className="space-y-3">
            {signers.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {step.user?.name || 'N/A'}
                    </p>
                    {getStatusIcon(step.status)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {step.user?.email || 'N/A'}
                  </p>
                  <div className="mt-2">
                    {getStatusBadge(step.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvers.length === 0 && signers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Chưa có người tham gia</p>
        </div>
      )}
    </div>
  );
}
