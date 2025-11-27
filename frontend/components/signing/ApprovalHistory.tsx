'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, MessageSquare, User } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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

interface ApprovalHistoryProps {
  approvals: Approval[];
}

export default function ApprovalHistory({ approvals }: ApprovalHistoryProps) {
  if (!approvals || approvals.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Đã duyệt</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Từ chối</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Chờ duyệt</Badge>;
    }
  };

  const getStatusDate = (approval: Approval) => {
    if (approval.approved_at) {
      return format(new Date(approval.approved_at), 'dd/MM/yyyy HH:mm', { locale: vi });
    }
    if (approval.rejected_at) {
      return format(new Date(approval.rejected_at), 'dd/MM/yyyy HH:mm', { locale: vi });
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5" />
          Lịch sử phê duyệt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {approvals.map((approval, index) => (
            <div
              key={approval.id}
              className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0"
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(approval.status)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">
                        {approval.approver.full_name}
                      </p>
                      {getStatusBadge(approval.status)}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {approval.approver.email}
                    </p>
                  </div>
                </div>

                {/* Date */}
                {getStatusDate(approval) && (
                  <p className="text-xs text-gray-500 mb-2">
                    {getStatusDate(approval)}
                  </p>
                )}

                {/* Comments */}
                {approval.comments && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {approval.comments}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
