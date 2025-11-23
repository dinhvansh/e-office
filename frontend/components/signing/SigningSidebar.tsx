'use client';

import { CheckCircle, Clock, Eye, FileText, User, X } from 'lucide-react';

interface Signer {
  id: number;
  name: string;
  email: string;
  status: string;
  signed_at?: string;
  role: string;
}

interface Activity {
  id: number;
  user_name: string;
  action: string;
  timestamp: string;
}

interface SigningSidebarProps {
  document: {
    title: string;
    original_file_name: string;
    created_at: string;
  };
  signRequest: {
    title: string;
    deadline?: string;
    created_at: string;
  };
  signers: Signer[];
  currentSigner: Signer;
  activities?: Activity[];
}

export default function SigningSidebar({
  document,
  signRequest,
  signers,
  currentSigner,
  activities = [],
}: SigningSidebarProps) {
  const getStatusBadge = (status: string, size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
    switch (status) {
      case 'signed':
      case 'completed':
        return (
          <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium bg-green-100 text-green-800`}>
            <CheckCircle className="w-3 h-3" />
            Đã ký
          </span>
        );
      case 'pending':
        return (
          <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium bg-yellow-100 text-yellow-800`}>
            <Clock className="w-3 h-3" />
            Chờ ký
          </span>
        );
      case 'rejected':
        return (
          <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium bg-red-100 text-red-800`}>
            <X className="w-3 h-3" />
            Đã từ chối
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium bg-gray-100 text-gray-800`}>
            <Clock className="w-3 h-3" />
            Chờ ký
          </span>
        );
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('ký')) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    if (action.includes('xem')) {
      return <Eye className="w-4 h-4 text-blue-600" />;
    }
    return <FileText className="w-4 h-4 text-gray-600" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
  const signedCount = signers.filter(s => s.status === 'signed').length;
  const progressPercent = totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0;

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-screen overflow-y-auto flex-shrink-0 shadow-lg">
      {/* Status Badge */}
      <div className="p-4 border-b border-gray-200 bg-yellow-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Trạng thái</span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Clock className="w-4 h-4" />
            Đang chờ ký ({signedCount}/{totalSigners})
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Document Info */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Thông tin chung
        </h3>
        
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-600 block mb-1">Người tạo</span>
            <span className="font-medium text-gray-900">{currentSigner.name || 'N/A'}</span>
          </div>
          
          <div>
            <span className="text-gray-600 block mb-1">Ngày gửi</span>
            <span className="font-medium text-gray-900">
              {formatDate(signRequest.created_at)}
            </span>
          </div>
          
          {signRequest.deadline && (
            <div>
              <span className="text-gray-600 block mb-1">Ngày hết hạn</span>
              <span className="font-medium text-gray-900">
                {formatDate(signRequest.deadline)}
              </span>
            </div>
          )}
          
          <div>
            <span className="text-gray-600 block mb-1">Mã tài liệu</span>
            <span className="font-mono text-xs font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
              {document.original_file_name || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Signers List */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-purple-600" />
          Danh sách người ký ({signedCount}/{totalSigners})
        </h3>
        
        <div className="space-y-3">
          {signers.map((signer) => (
            <div 
              key={signer.id}
              className={`p-3 rounded-lg border transition-all ${
                signer.id === currentSigner.id
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  signer.status === 'signed'
                    ? 'bg-green-100'
                    : signer.status === 'rejected'
                    ? 'bg-red-100'
                    : 'bg-yellow-100'
                }`}>
                  {signer.status === 'signed' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : signer.status === 'rejected' ? (
                    <X className="w-5 h-5 text-red-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {signer.name}
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
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity History */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-600" />
          Lịch sử hoạt động
        </h3>
        
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Chưa có hoạt động nào</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(activity.action)}
                </div>
                
                {/* Content */}
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
        )}
      </div>
    </div>
  );
}
