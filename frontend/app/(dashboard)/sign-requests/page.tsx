'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { PenTool, Eye, Search, Edit, Upload, GitBranch, MoreVertical, Trash2, XCircle, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { toast } from 'sonner';

interface SignRequest {
  id: number;
  status: string;
  created_at: string;
  document: {
    id: number;
    title: string | null;
    original_file_name: string;
    document_number: string | null;
    owner: {
      id: number;
      full_name: string | null;
      email: string;
    };
  };
  signers: Array<{
    id: number;
    name: string;
    email: string;
    status: string;
    signed_at: string | null;
    signing_order: number | null;
    is_internal: boolean; // ✅ Added
    user_id: number | null; // ✅ Added
  }>;
  progress: {
    total: number;
    signed: number;
    rejected: number;
    pending: number;
    percentage: number;
  };
}

export default function SignRequestsPage() {
  const { fetchJson, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Copy signing link for external signers
  const handleCopySigningLink = async (request: SignRequest) => {
    try {
      // Get external signer with token
      const externalSigner = request.signers.find(s => !s.email.includes('@acme.local'));
      if (!externalSigner) {
        alert('Không tìm thấy người ký bên ngoài');
        return;
      }

      // Fetch signer details to get token
      const response = await fetchJson<any>(`/sign-requests/${request.id}`);
      const signerWithToken = response.signers?.find((s: any) => s.id === externalSigner.id);
      
      if (!signerWithToken?.signing_token) {
        alert('Chưa có link ký. Vui lòng gửi yêu cầu ký trước.');
        return;
      }

      const signingUrl = `${window.location.origin}/sign/${signerWithToken.signing_token}`;
      await navigator.clipboard.writeText(signingUrl);
      alert('✅ Đã copy link ký vào clipboard!');
    } catch (error: any) {
      console.error('Copy link error:', error);
      alert('❌ Lỗi: ' + (error.message || 'Không thể copy link'));
    }
  };

  // Resend email to external signers
  const handleResendEmail = async (signRequestId: number) => {
    if (!confirm('Gửi lại email cho người ký bên ngoài?')) return;
    
    try {
      await fetchJson(`/sign-requests/${signRequestId}/send`, {
        method: 'POST',
      });
      toast.success('Đã gửi lại email thành công!');
    } catch (error: any) {
      console.error('Resend email error:', error);
      toast.error('Lỗi: ' + (error.message || 'Không thể gửi email'));
    }
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ signRequestId, documentId }: { signRequestId: number; documentId: number }) => {
      await fetchJson(`/sign-requests/${signRequestId}`, { method: 'DELETE' });
      await fetchJson(`/documents/${documentId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Đã xóa văn bản thành công!');
      queryClient.invalidateQueries({ queryKey: ['my-sign-requests'] });
    },
    onError: (error: any) => {
      toast.error('Lỗi: ' + (error.message || 'Không thể xóa văn bản'));
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (signRequestId: number) => {
      await fetchJson(`/sign-requests/${signRequestId}/cancel`, { method: 'POST' });
    },
    onSuccess: () => {
      toast.success('Đã hủy luồng ký thành công!');
      queryClient.invalidateQueries({ queryKey: ['my-sign-requests'] });
    },
    onError: (error: any) => {
      toast.error('Lỗi: ' + (error.message || 'Không thể hủy luồng ký'));
    },
  });

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: async (signRequestId: number) => {
      await fetchJson(`/sign-requests/${signRequestId}/revoke`, { method: 'POST' });
    },
    onSuccess: () => {
      toast.success('Đã thu hồi văn bản thành công!');
      queryClient.invalidateQueries({ queryKey: ['my-sign-requests'] });
    },
    onError: (error: any) => {
      toast.error('Lỗi: ' + (error.message || 'Không thể thu hồi văn bản'));
    },
  });

  // Delete handler
  const handleDelete = (signRequestId: number, documentId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa văn bản',
      message: 'Bạn có chắc muốn xóa yêu cầu ký này?\n\nHành động này không thể hoàn tác!',
      confirmText: 'Xóa',
      onConfirm: () => deleteMutation.mutate({ signRequestId, documentId }),
    });
  };

  // Cancel handler
  const handleCancel = (signRequestId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hủy luồng ký',
      message: 'Bạn có chắc muốn hủy luồng ký này?\n\nTất cả người ký sẽ không thể ký nữa!',
      confirmText: 'Hủy luồng',
      onConfirm: () => cancelMutation.mutate(signRequestId),
    });
  };

  // Revoke handler
  const handleRevoke = (signRequestId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Thu hồi văn bản',
      message: 'Bạn có chắc muốn thu hồi văn bản đã thanh lý?\n\nVăn bản sẽ chuyển về trạng thái nháp và cần ký lại!',
      confirmText: 'Thu hồi',
      onConfirm: () => revokeMutation.mutate(signRequestId),
    });
  };

  // Check if current user is a pending internal signer
  const isCurrentUserPendingSigner = (request: SignRequest) => {
    if (!user?.id) return false;
    return request.signers.some(
      s => s.is_internal && 
           s.user_id === user.id && 
           (s.status === 'pending' || s.status === 'otp_sent')
    );
  };

  // Check if it's current user's turn to sign (for sequential)
  const isCurrentUserTurn = (request: SignRequest) => {
    if (!user?.id) return false;
    
    const currentUserSigner = request.signers.find(
      s => s.is_internal && s.user_id === user.id
    );
    
    if (!currentUserSigner || currentUserSigner.status === 'signed') {
      return false;
    }

    // For sequential signing, check if all previous signers have signed
    const previousSigners = request.signers.filter(
      s => (s.signing_order || 0) < (currentUserSigner.signing_order || 0)
    );
    
    if (previousSigners.length === 0) {
      return true; // First signer
    }

    return previousSigners.every(s => s.status === 'signed' || s.status === 'completed');
  };

  const { data, isLoading } = useQuery({
    queryKey: ['my-sign-requests', filter],
    queryFn: async () => {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetchJson<{ sign_requests: SignRequest[] }>(
        `/sign-requests/my-requests${params}`
      );
      return res.sign_requests;
    },
  });

  const getStatusBadge = (progress: SignRequest['progress'], status: string) => {
    if (status === 'cancelled') {
      return <Badge variant="secondary" className="bg-gray-500 text-white">Đã hủy</Badge>;
    }
    if (progress.rejected > 0) {
      return <Badge variant="destructive">Đã từ chối</Badge>;
    }
    if (progress.percentage === 100 || status === 'completed') {
      return <Badge className="bg-green-500 hover:bg-green-600">Đã hoàn thành</Badge>;
    }
    if (status === 'pending' || status === 'in_progress') {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Chờ ký</Badge>;
    }
    return <Badge variant="secondary">Nháp</Badge>;
  };

  const getProgressColor = (percentage: number, rejected: number, status: string) => {
    if (status === 'cancelled') return 'bg-gray-400';
    if (rejected > 0) return 'bg-red-500';
    if (percentage === 100) return 'bg-green-500';
    if (percentage > 0) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const filteredData = data?.filter(request => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const docTitle = request.document.title || request.document.original_file_name;
    const docNumber = request.document.document_number || '';
    return docTitle.toLowerCase().includes(searchLower) || 
           docNumber.toLowerCase().includes(searchLower);
  });

  const stats = {
    all: data?.length || 0,
    pending: data?.filter(r => r.status === 'pending' || r.status === 'in_progress').length || 0,
    completed: data?.filter(r => r.status === 'completed' || r.progress.percentage === 100).length || 0,
    rejected: data?.filter(r => r.progress.rejected > 0).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          icon={PenTool}
          title="Yêu cầu Ký số"
          description="Theo dõi và quản lý các yêu cầu ký số bạn đã tạo"
          iconColor="text-green-600"
        />
        <Button
          onClick={() => router.push('/sign-requests/create')}
          className="bg-green-600 hover:bg-green-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Tạo yêu cầu ký mới
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Tất cả ({stats.all})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'pending'
              ? 'border-yellow-600 text-yellow-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Chờ ký ({stats.pending})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'completed'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Đã hoàn thành ({stats.completed})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'rejected'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Đã từ chối ({stats.rejected})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Tìm theo tên tài liệu hoặc mã số..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Mã yêu cầu</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Tên tài liệu</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Người tạo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Ngày tạo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Tiến độ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Đang tải...
                    </td>
                  </tr>
                ) : filteredData && filteredData.length > 0 ? (
                  filteredData.map((request) => (
                    <tr key={request.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">
                          {request.document.document_number || `#${request.id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {request.document.title || request.document.original_file_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {request.document.owner.full_name || request.document.owner.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {dayjs(request.created_at).format('DD/MM/YYYY')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
                            <div
                              className={`h-full transition-all ${getProgressColor(
                                request.progress.percentage,
                                request.progress.rejected,
                                request.status
                              )}`}
                              style={{ width: `${request.progress.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium min-w-[50px]">
                            {request.progress.signed}/{request.progress.total}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(request.progress, request.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-center">
                          {/* Edit Workflow Button - Show for draft documents */}
                          {request.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/sign-requests/${request.id}/editor`)}
                              title="Chỉnh sửa luồng ký"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Internal Signing Button - Show if current user is pending signer */}
                          {isCurrentUserPendingSigner(request) && isCurrentUserTurn(request) && (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/sign-requests/${request.id}/sign`)}
                              title="Ký ngay"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <PenTool className="w-4 h-4" />
                            </Button>
                          )}

                          {/* View Details Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/sign-requests/${request.id}`)}
                            title="Xem luồng"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {/* More Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                disabled={deleteMutation.isPending || cancelMutation.isPending || revokeMutation.isPending}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {/* Delete - Draft only */}
                              {request.status === 'draft' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(request.id, request.document.id)}
                                    disabled={deleteMutation.isPending}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa văn bản'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}

                              {/* Cancel - Pending/In Progress only */}
                              {(request.status === 'pending' || request.status === 'in_progress') && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleCancel(request.id)}
                                    disabled={cancelMutation.isPending}
                                    className="text-orange-600 focus:text-orange-600"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy luồng ký'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}

                              {/* Revoke - Completed internal documents only */}
                              {(request.status === 'completed' || request.progress.percentage === 100) && 
                               request.signers.every(s => s.is_internal) && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleRevoke(request.id)}
                                    disabled={revokeMutation.isPending}
                                    className="text-purple-600 focus:text-purple-600"
                                  >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    {revokeMutation.isPending ? 'Đang thu hồi...' : 'Thu hồi văn bản'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}

                              {/* External Signer Actions */}
                              {request.signers.some(s => !s.is_internal) && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleCopySigningLink(request)}
                                  >
                                    📋 Copy link ký
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleResendEmail(request.id)}
                                  >
                                    📧 Gửi lại email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}

                              {/* View Flow */}
                              <DropdownMenuItem
                                onClick={() => router.push(`/documents/${request.document.id}/flow`)}
                              >
                                <GitBranch className="w-4 h-4 mr-2" />
                                Xem luồng chi tiết
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {searchQuery ? 'Không tìm thấy yêu cầu ký nào' : 'Chưa có yêu cầu ký nào'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText="Hủy"
      />
    </div>
  );
}
