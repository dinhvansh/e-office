'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { PenTool, Eye, Search, Edit, Upload, GitBranch, MoreVertical, Trash2, XCircle, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useDestructiveConfirmation } from '@/components/providers/destructive-confirmation-provider';
import { AsyncErrorState } from '@/components/ui/async-state';

interface SignRequest {
  id: number;
  status: string;
  flow_state?: string;
  next_action?: string;
  created_at: string;
  document: {
    id: number;
    title: string | null;
    original_file_name: string;
    document_number: string | null;
    status: string | null;
    document_type?: string | null;
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
  const confirmDestructive = useDestructiveConfirmation();
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Cancel dialog with reason
  const [cancelDialog, setCancelDialog] = useState<{ 
    open: boolean; 
    signRequestId: number | null; 
    reason: string 
  }>({
    open: false,
    signRequestId: null,
    reason: '',
  });

  // Copy signing link for signers
  const handleCopySigningLink = async (request: SignRequest) => {
    try {
      // Fetch full sign request details to get tokens
      const response = await fetchJson<any>(`/sign-requests/${request.id}`);
      
      // Find first signer with token (prefer external, then internal)
      const externalSigner = response.signers?.find((s: any) => !s.is_internal && s.signing_token);
      const internalSigner = response.signers?.find((s: any) => s.is_internal && s.signing_token);
      const signerWithToken = externalSigner || internalSigner;
      
      if (!signerWithToken?.signing_token) {
        alert('Chưa có link ký. Vui lòng gửi yêu cầu ký trước.');
        return;
      }

      const signingUrl = `${window.location.origin}/sign/${signerWithToken.signing_token}`;
      await navigator.clipboard.writeText(signingUrl);
      alert(`✅ Đã copy link ký cho ${signerWithToken.name || signerWithToken.email}!`);
    } catch (error: any) {
      console.error('Copy link error:', error);
      alert('❌ Lỗi: ' + (error.message || 'Không thể copy link'));
    }
  };

  // Resend email to external signers
  const handleResendEmail = (signRequestId: number) => {
    confirmDestructive({
      title: 'Gửi lại email ký',
      targetName: `Yêu cầu ký #${signRequestId}`,
      description: 'Email mời ký sẽ được gửi lại cho người ký bên ngoài.',
      confirmLabel: 'Gửi lại email',
      errorMessage: 'Không thể gửi lại email. Vui lòng thử lại.',
      destructive: false,
    }, async () => {
      const res = await fetchJson<{ sign_request?: { flow_state?: string } }>(`/sign-requests/${signRequestId}/send`, {
        method: 'POST',
      });
      const flow = res?.sign_request?.flow_state;
      if (flow === 'AWAITING_APPROVAL') {
        toast.success('Đã gửi lại và chuyển về bước chờ duyệt.');
      } else {
        toast.success('Đã gửi lại email thành công!');
      }
    });
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

  // Cancel mutation with reason
  const cancelMutation = useMutation({
    mutationFn: async ({ signRequestId, reason }: { signRequestId: number; reason: string }) => {
      await fetchJson(`/sign-requests/${signRequestId}/cancel`, { 
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast.success('Đã hủy luồng ký! Email thông báo đã được gửi đến tất cả người ký.');
      setCancelDialog({ open: false, signRequestId: null, reason: '' });
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
    confirmDestructive({
      title: 'Xóa yêu cầu ký',
      targetName: `Yêu cầu ký #${signRequestId}`,
      description: 'Yêu cầu ký và văn bản liên quan sẽ bị xóa. Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa yêu cầu ký',
      errorMessage: 'Không thể xóa yêu cầu ký. Vui lòng thử lại.',
    }, () => deleteMutation.mutateAsync({ signRequestId, documentId }));
  };

  // Cancel handler - open dialog with reason input
  const handleCancel = (signRequestId: number) => {
    setCancelDialog({ open: true, signRequestId, reason: '' });
  };

  // Confirm cancel with reason
  const confirmCancel = () => {
    if (cancelDialog.signRequestId) {
      cancelMutation.mutate({
        signRequestId: cancelDialog.signRequestId,
        reason: cancelDialog.reason || 'Không có lý do',
      });
    }
  };

  // Revoke handler
  const handleRevoke = (signRequestId: number) => {
    confirmDestructive({
      title: 'Thu hồi yêu cầu ký',
      targetName: `Yêu cầu ký #${signRequestId}`,
      description: 'Yêu cầu sẽ trở về trạng thái nháp và cần được ký lại.',
      confirmLabel: 'Thu hồi yêu cầu',
      errorMessage: 'Không thể thu hồi yêu cầu ký. Vui lòng thử lại.',
    }, () => revokeMutation.mutateAsync(signRequestId));
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

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-sign-requests', filter, currentPage, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const res = await fetchJson<{ 
        sign_requests: SignRequest[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        }
      }>(
        `/sign-requests/my-requests?${params.toString()}`
      );
      return res;
    },
  });

  const data = response?.sign_requests;
  const pagination = response?.pagination;

  const getStatusBadge = (request: SignRequest) => {
    if (request.flow_state === 'CANCELLED' || request.status === 'cancelled') {
      return <Badge variant="secondary" className="bg-gray-500 text-white">Đã hủy</Badge>;
    }
    if (request.flow_state === 'REJECTED' || request.progress.rejected > 0) {
      return <Badge variant="destructive">Đã từ chối</Badge>;
    }
    if (request.flow_state === 'COMPLETED' || request.status === 'completed' || request.progress.percentage === 100) {
      return <Badge className="bg-green-500 hover:bg-green-600">Đã hoàn thành</Badge>;
    }
    if (request.flow_state === 'AWAITING_APPROVAL' || request.status === 'pending_approval') {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Chờ duyệt</Badge>;
    }
    if (request.flow_state === 'AWAITING_SIGNATURES' || request.status === 'pending' || request.status === 'in_progress') {
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

  // Reset to page 1 when filter changes
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const stats = {
    all: data?.length || 0,
    pending: data?.filter(r => r.status === 'pending_approval' || r.status === 'pending' || r.status === 'in_progress').length || 0,
    completed: data?.filter(r => r.status === 'completed' || r.progress.percentage === 100).length || 0,
    rejected: data?.filter(r => r.progress.rejected > 0).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          icon={PenTool}
          title="Yêu cầu Ký điện tử"
          description="Theo dõi và quản lý các yêu cầu ký điện tử bạn đã tạo"
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
          onClick={() => handleFilterChange('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Tất cả {pagination && `(${pagination.total})`}
        </button>
        <button
          onClick={() => handleFilterChange('pending')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'pending'
              ? 'border-yellow-600 text-yellow-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Chờ ký
        </button>
        <button
          onClick={() => handleFilterChange('completed')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'completed'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Đã hoàn thành
        </button>
        <button
          onClick={() => handleFilterChange('rejected')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'rejected'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Đã từ chối
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

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium">Mã YC</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">Tên tài liệu</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">Loại</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">Người tạo</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">Ngày</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">Tiến độ</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">Trạng thái</th>
                  <th className="px-2 py-2 text-center text-xs font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Đang tải...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr><td colSpan={8}><AsyncErrorState message="Không thể tải trình ký. Vui lòng thử lại." onRetry={() => void refetch()} /></td></tr>
                ) : filteredData && filteredData.length > 0 ? (
                  filteredData.map((request) => (
                    <tr 
                      key={request.id} 
                      className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/documents/${request.document.id}/flow`)}
                    >
                      <td className="px-2 py-3">
                        <span className="font-mono text-xs">
                          {request.document.document_number || `#${request.id}`}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className="font-medium text-sm truncate max-w-[150px] inline-block">
                          {request.document.title || request.document.original_file_name}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className="text-xs text-gray-600 truncate max-w-[100px] inline-block">
                          {request.document.document_type || '—'}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className="text-xs truncate max-w-[120px] inline-block">
                          {request.document.owner.full_name || request.document.owner.email}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {dayjs(request.created_at).format('DD/MM/YY')}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full transition-all ${getProgressColor(
                                request.progress.percentage,
                                request.progress.rejected,
                                request.status
                              )}`}
                              style={{ width: `${request.progress.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium min-w-[40px] whitespace-nowrap">
                            {request.progress.signed}/{request.progress.total}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {getStatusBadge(request)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                          {/* Edit Workflow Button - Show for draft documents */}
                          {(request.flow_state === 'DRAFT' || request.status === 'draft') && (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/sign-requests/${request.id}/editor`)}
                              title="Chỉnh sửa luồng ký"
                              className="bg-blue-600 hover:bg-blue-700 text-white h-7 w-7 p-0"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          
                          {/* Internal Signing Button - Show if current user is pending signer */}
                          {isCurrentUserPendingSigner(request) && isCurrentUserTurn(request) && (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/sign-requests/${request.id}/sign`)}
                              title="Ký ngay"
                              className="bg-green-600 hover:bg-green-700 text-white h-7 w-7 p-0"
                            >
                              <PenTool className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {/* View Document Flow Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/documents/${request.document.id}/flow`)}
                            title="Xem tài liệu"
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          
                          {/* More Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                disabled={deleteMutation.isPending || cancelMutation.isPending || revokeMutation.isPending}
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {/* Delete - Draft only */}
                              {(request.flow_state === 'DRAFT' || request.status === 'draft') && ['draft', 'cancelled'].includes(request.document.status || '') && (
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
                              {(request.flow_state === 'AWAITING_SIGNATURES' || request.status === 'pending' || request.status === 'in_progress') && (
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
                              {(request.flow_state === 'COMPLETED' || request.status === 'completed' || request.progress.percentage === 100) && 
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      {searchQuery ? 'Không tìm thấy yêu cầu ký nào' : 'Chưa có yêu cầu ký nào'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {/* Pagination */}
        {!isLoading && filteredData && filteredData.length > 0 && pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, pagination.total)} trong tổng số {pagination.total}
              </span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(parseInt(value)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                Trang {currentPage} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pagination.totalPages)}
                disabled={currentPage >= pagination.totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="p-4 text-center text-gray-500">
              Đang tải...
            </CardContent>
          </Card>
        ) : isError ? (
          <AsyncErrorState message="Không thể tải trình ký. Vui lòng thử lại." onRetry={() => void refetch()} />
        ) : filteredData && filteredData.length > 0 ? (
          <>
            {filteredData.map((request) => (
              <Card 
                key={request.id}
                className="hover:shadow-md transition-shadow"
                onClick={() => router.push(`/documents/${request.document.id}/flow`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {request.document.title || request.document.original_file_name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {request.document.document_number || `#${request.id}`}
                      </p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      {getStatusBadge(request)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-muted-foreground">Loại:</span>
                      <p className="font-medium truncate">{request.document.document_type || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ngày:</span>
                      <p className="font-medium">{dayjs(request.created_at).format('DD/MM/YY')}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Tiến độ</span>
                      <span className="font-medium">{request.progress.signed}/{request.progress.total}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getProgressColor(request.progress.percentage, request.progress.rejected, request.status)}`}
                        style={{ width: `${request.progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {(request.flow_state === 'DRAFT' || request.status === 'draft') && (
                      <Button size="sm" onClick={() => router.push(`/sign-requests/${request.id}/editor`)} className="flex-1 bg-blue-600 text-white text-xs h-8">
                        <Edit className="w-3.5 h-3.5 mr-1" />Chỉnh sửa
                      </Button>
                    )}
                    {isCurrentUserPendingSigner(request) && isCurrentUserTurn(request) && (
                      <Button size="sm" onClick={() => router.push(`/sign-requests/${request.id}/sign`)} className="flex-1 bg-green-600 text-white text-xs h-8">
                        <PenTool className="w-3.5 h-3.5 mr-1" />Ký ngay
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => router.push(`/documents/${request.document.id}/flow`)} className="flex-1 text-xs h-8">
                      <Eye className="w-3.5 h-3.5 mr-1" />Xem
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {(request.flow_state === 'DRAFT' || request.status === 'draft') && (
                          <DropdownMenuItem onClick={() => handleDelete(request.id, request.document.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />Xóa
                          </DropdownMenuItem>
                        )}
                        {(request.flow_state === 'AWAITING_SIGNATURES' || request.status === 'pending' || request.status === 'in_progress') && (
                          <DropdownMenuItem onClick={() => handleCancel(request.id)} className="text-orange-600">
                            <XCircle className="w-4 h-4 mr-2" />Hủy
                          </DropdownMenuItem>
                        )}
                        {request.signers.some(s => !s.is_internal) && (
                          <>
                            <DropdownMenuItem onClick={() => handleCopySigningLink(request)}>📋 Copy link</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResendEmail(request.id)}>📧 Gửi lại</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Mobile Pagination */}
            {pagination && (
              <div className="flex items-center justify-between px-2 py-3">
                <span className="text-xs text-muted-foreground">
                  {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, pagination.total)} / {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs px-2">{currentPage}/{pagination.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= pagination.totalPages} className="h-8 w-8 p-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(pagination.totalPages)} disabled={currentPage >= pagination.totalPages} className="h-8 w-8 p-0">
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <PenTool className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-sm">
                {searchQuery ? 'Không tìm thấy' : 'Chưa có yêu cầu ký'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancel Dialog with Reason */}
      {cancelDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Hủy luồng ký</h3>
              <p className="text-sm text-gray-600 mb-4">
                Vui lòng nhập lý do hủy. Email thông báo sẽ được gửi đến tất cả người ký.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Lý do hủy <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="VD: Tài liệu cần chỉnh sửa lại nội dung..."
                  value={cancelDialog.reason}
                  onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setCancelDialog({ open: false, signRequestId: null, reason: '' })}
                  disabled={cancelMutation.isPending}
                >
                  Đóng
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmCancel}
                  disabled={cancelMutation.isPending || !cancelDialog.reason.trim()}
                >
                  {cancelMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


