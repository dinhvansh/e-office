'use client';

import { CheckCircle, Clock, User, X, MessageSquare } from 'lucide-react';
import ApprovalHistory from './ApprovalHistory';

interface Signer {
  id: number;
  name: string;
  email: string;
  status: string;
  signed_at?: string;
  role: string;
  signing_order?: number;
}

interface Activity {
  id: number;
  user_name: string;
  action: string;
  timestamp: string;
}

interface Approval {
  id: number;
  status: string;
  comments?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  approver: {
    id: number;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
}

interface InternalSigningSidebarProps {
  signers: Signer[];
  activities?: Activity[];
  currentSignerId: number;
  approvals?: Approval[];
}

export default function InternalSigningSidebar({
  signers,
  activities = [],
  currentSignerId,
  approvals = [],
}: InternalSigningSidebarProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Đã ký
          </span>
        );
      case 'pending':
      case 'otp_sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Chờ ký
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-800">
            <X className="w-3 h-3" />
            Từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3" />
            Chờ
          </span>
        );
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate signing progress
  const totalSigners = signers.length;
  const signedCount = signers.filter(s => s.status === 'signed' || s.status === 'completed').length;
  const progressPercent = totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Tiến độ ký</span>
          <span className="text-sm font-semibold text-gray-900">
            {signedCount}/{totalSigners}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {progressPercent === 100 ? 'Hoàn thành' : `${Math.round(progressPercent)}% hoàn thành`}
        </p>
      </div>

      {/* Approvals */}
      {approvals && approvals.length > 0 && (
        <ApprovalHistory approvals={approvals} />
      )}

      {/* Signers List */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-purple-600" />
          Danh sách người ký
        </h3>
        
        <div className="space-y-3">
          {signers.map((signer) => (
            <div 
              key={signer.id}
              className={`p-3 rounded-lg border transition-all ${
                signer.id === currentSignerId
                  ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Order Badge */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                  {signer.signing_order || '?'}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {signer.name || signer.email}
                    </span>
                    {getStatusBadge(signer.status)}
                  </div>
                  <p className="text-xs text-gray-600 truncate mb-1">
                    {signer.email}
                  </p>
                  {signer.signed_at && (
                    <p className="text-xs text-gray-500">
                      Đã ký: {formatDateTime(signer.signed_at)}
                    </p>
                  )}
                  {signer.id === currentSignerId && (
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      👉 Đây là bạn
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity History */}
      {activities.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            Lịch sử hoạt động
          </h3>
          
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user_name}</span>
                    {' '}
                    <span className="text-gray-600">{activity.action}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
