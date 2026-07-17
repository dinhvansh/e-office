'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { FlowTimeline } from '@/components/flow/FlowTimeline';
import { FlowActivities } from '@/components/flow/FlowActivities';
import { FlowParticipants } from '@/components/flow/FlowParticipants';
import SimplePDFViewer from '@/components/pdf/SimplePDFViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Download, RefreshCw, Share2, Trash2, History } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WorkflowStatusPanel } from '@/components/workflow/WorkflowStatusPanel';
import { SignRequestDiscussion } from '@/components/sign-requests/sign-request-discussion';
import { toast } from 'sonner';

type SharePermissionRecord = {
  id: number;
  permission_source: 'share' | 'baseline';
  subject_type: 'user' | 'department' | 'position_in_department' | 'role';
  subject_id: number;
  scope_department_id: number;
  can_read: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_share: boolean;
  can_delete: boolean;
};

type ShareUserOption = {
  id: number;
  email: string;
  full_name?: string;
};

type ShareDepartmentOption = {
  id: number;
  name: string;
};

type SharePositionOption = {
  id: number;
  name: string;
  code?: string;
  is_active?: boolean;
};

export default function DocumentFlowPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const documentId = params.id as string;
  const [activeTab, setActiveTab] = useState<'activities' | 'participants' | 'discussion'>(() =>
    typeof window !== 'undefined' && window.location.hash === '#discussion' ? 'discussion' : 'activities'
  );
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareForm, setShareForm] = useState({
    subject_type: 'user' as 'user' | 'department' | 'position_in_department',
    subject_id: '',
    scope_department_id: '',
    can_read: true,
    can_share: false,
  });

  // Fetch flow data with auto-refresh to show new signatures
  const { data: flowData, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<any>({
    queryKey: ['document-flow', documentId],
    queryFn: async () => {
      const response = await fetchJson(`/documents/${documentId}/flow`);
      return response;
    },
    refetchInterval: (query) => {
      // Auto-refresh every 10 seconds if document is in progress
      // Stop refreshing when completed or rejected
      const status = query.state.data?.document?.status;
      if (
        status === 'in_progress' ||
        status === 'pending' ||
        status === 'pending_signature' ||
        status === 'pending_approval'
      ) {
        return 10000; // 10 seconds
      }
      return false; // Stop auto-refresh
    },
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  const pdfUrl = useMemo(() => {
    const document = flowData?.document;
    if (typeof window !== 'undefined' && documentId && document) {
      if (!process.env.NEXT_PUBLIC_API_URL) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      // Priority: Use signed_file_path if exists (progressive or completed)
      // This shows the latest PDF with signatures as they are added
      const hasSignedFile = document.signed_file_path;
      const endpoint = hasSignedFile ? 'view-signed' : 'view';
      
      // Add timestamp to force reload when signed_file_path changes
      // This prevents browser from showing cached old PDF
      const cacheBuster = hasSignedFile ? `?t=${dataUpdatedAt}` : '';
      
      return `${apiUrl}/documents/${documentId}/${endpoint}${cacheBuster}`;
    }
    return '';
  }, [dataUpdatedAt, documentId, flowData]);

  const isCompleted = (flowData?.document?.status || '').toLowerCase() === 'completed';

  const { data: sharePermissionsData } = useQuery<{ permissions: SharePermissionRecord[] }>({
    queryKey: ['document-share-permissions', documentId],
    enabled: shareDialogOpen && isCompleted,
    queryFn: () => fetchJson(`/documents/${documentId}/permissions`),
  });

  const { data: shareUsersData } = useQuery<ShareUserOption[]>({
    queryKey: ['document-share-users'],
    enabled: shareDialogOpen && isCompleted,
    queryFn: () => fetchJson('/users/active'),
  });

  const { data: shareDepartmentsData } = useQuery<any>({
    queryKey: ['document-share-departments'],
    enabled: shareDialogOpen && isCompleted,
    queryFn: () => fetchJson('/departments'),
  });

  const { data: sharePositionsData } = useQuery<any>({
    queryKey: ['document-share-positions'],
    enabled: shareDialogOpen && isCompleted,
    queryFn: () => fetchJson('/positions'),
  });

  const sharePermissions = (sharePermissionsData?.permissions || []).filter((item) => item.permission_source === 'share');
  const shareUsers = shareUsersData || [];
  const shareDepartments = Array.isArray(shareDepartmentsData)
    ? shareDepartmentsData
    : (shareDepartmentsData?.departments || shareDepartmentsData?.data?.departments || shareDepartmentsData?.data || []);
  const sharePositions = ((sharePositionsData?.positions || sharePositionsData?.data?.positions || sharePositionsData?.data || sharePositionsData || []) as SharePositionOption[])
    .filter((item) => item.is_active !== false);

  const getShareSubjectLabel = (permission: SharePermissionRecord) => {
    if (permission.subject_type === 'user') {
      const match = shareUsers.find((item) => item.id === permission.subject_id);
      return match?.full_name || match?.email || `User #${permission.subject_id}`;
    }

    if (permission.subject_type === 'department') {
      const match = shareDepartments.find((item: ShareDepartmentOption) => item.id === permission.subject_id);
      return match?.name || `Phòng ban #${permission.subject_id}`;
    }

    if (permission.subject_type === 'position_in_department') {
      const position = sharePositions.find((item) => item.id === permission.subject_id);
      const department = shareDepartments.find((item: ShareDepartmentOption) => item.id === permission.scope_department_id);
      return `${position?.name || `Chức danh #${permission.subject_id}`} / ${department?.name || `Phòng ban #${permission.scope_department_id}`}`;
    }

    return `Đối tượng #${permission.subject_id}`;
  };

  const remindMutation = useMutation({
    mutationFn: async () => {
      const signRequestId = flowData?.document?.sign_request_id;
      if (!signRequestId) {
        throw new Error('Không tìm thấy luồng ký để nhắc nhở');
      }

      return fetchJson<{
        reminded: boolean;
        approvals_reminded: number;
        internal_signers_reminded: number;
        external_signers_reminded: number;
        total_reminded: number;
      }>(`/sign-requests/${signRequestId}/remind`, {
        method: 'POST',
      });
    },
    onSuccess: (result) => {
      toast.success(`Đã nhắc ${result.total_reminded} người đang chờ xử lý`);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Không thể gửi nhắc nhở');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const signRequestId = flowData?.document?.sign_request_id;
      if (!signRequestId) {
        throw new Error('Không tìm thấy request để hủy');
      }

      return fetchJson(`/sign-requests/${signRequestId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          reason: cancelReason.trim(),
        }),
      });
    },
    onSuccess: () => {
      toast.success('Đã hủy request ký');
      setCancelDialogOpen(false);
      setCancelReason('');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Không thể hủy request');
    },
  });

  const grantShareMutation = useMutation({
    mutationFn: async () => {
      if (!isCompleted) {
        throw new Error('Chỉ được chia sẻ sau khi tài liệu hoàn thành');
      }

      return fetchJson(`/documents/${documentId}/permissions`, {
        method: 'POST',
        body: JSON.stringify({
          permission_source: 'share',
          subject_type: shareForm.subject_type,
          subject_id: Number(shareForm.subject_id),
          scope_department_id: shareForm.subject_type === 'position_in_department' ? Number(shareForm.scope_department_id) : undefined,
          can_read: shareForm.can_read,
          can_edit: false,
          can_approve: false,
          can_share: shareForm.can_share,
          can_delete: false,
        }),
      });
    },
    onSuccess: async () => {
      toast.success('Đã chia sẻ tài liệu');
      setShareForm({
        subject_type: 'user',
        subject_id: '',
        scope_department_id: '',
        can_read: true,
        can_share: false,
      });
      await queryClient.invalidateQueries({ queryKey: ['document-share-permissions', documentId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Không thể chia sẻ tài liệu');
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: async (permission: SharePermissionRecord) =>
      fetchJson(`/documents/${documentId}/permissions`, {
        method: 'DELETE',
        body: JSON.stringify({
          permission_source: 'share',
          subject_type: permission.subject_type,
          subject_id: permission.subject_id,
          scope_department_id: permission.subject_type === 'position_in_department' ? permission.scope_department_id : undefined,
        }),
      }),
    onSuccess: async () => {
      toast.success('Đã thu hồi chia sẻ');
      await queryClient.invalidateQueries({ queryKey: ['document-share-permissions', documentId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Không thể thu hồi chia sẻ');
    },
  });



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!flowData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 mb-4">Không tìm thấy tài liệu</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  const document = flowData?.document;
  const phases = flowData?.phases || [];
  const steps = flowData?.steps || [];
  const activities = flowData?.activities || [];
  const can_approve = flowData?.can_approve;
  const can_sign = flowData?.can_sign;
  const canManageSignRequest = Boolean(flowData?.can_manage_sign_request && flowData?.document?.sign_request_id);
  const canRemind = canManageSignRequest && ['pending_approval', 'pending_signature', 'in_progress', 'pending'].includes(document.status);
  const canCancel = canManageSignRequest && !['completed', 'cancelled'].includes(document.status);
  const canShareCompletedDocument = isCompleted;
  const hasWorkflowSteps = steps.length > 0;

  // Calculate progress percentage
  const completedSteps = steps.filter((s: any) => 
    s.status === 'approved' || s.status === 'signed'
  ).length;
  const progressPercent = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="w-fit shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start gap-2">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                  <h1 className="min-w-0 break-words text-lg font-semibold sm:text-xl">{document.title}</h1>
                  {(document.status === 'in_progress' || document.status === 'pending') && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                      Tự động cập nhật
                    </span>
                  )}
                </div>
                <p className="mt-1 break-words text-sm text-gray-500">
                  {document.document_number} • {document.document_type}
                  {document.signed_file_path && (
                    <span className="ml-2 text-green-600">
                      • {document.status === 'completed' ? 'Có PDF hoàn thành' : 'Có PDF đang ký'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 overflow-hidden lg:w-auto lg:flex-nowrap">
              {canRemind && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remindMutation.mutate()}
                  disabled={remindMutation.isPending}
                  className="min-w-0 max-w-full"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 shrink-0 ${remindMutation.isPending ? 'animate-spin' : ''}`} />
                  {remindMutation.isPending ? 'Đang nhắc...' : 'Nhắc nhở'}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-0 max-w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy request'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="shrink-0"
                title="Làm mới để xem cập nhật mới nhất"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              {canShareCompletedDocument && (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-0 max-w-full"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="h-4 w-4 shrink-0 sm:mr-2" />
                  Chia sẻ
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="min-w-0 max-w-full"
                onClick={() => router.push(`/audit/${documentId}`)}
              >
                <History className="h-4 w-4 shrink-0 sm:mr-2" />
                Log tài liệu
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="min-w-0 max-w-full px-2 text-[0px] sm:px-3 sm:text-sm"
                onClick={async () => {
                  try {
                    if (!process.env.NEXT_PUBLIC_API_URL) {
                      throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
                    }
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                    // Use signed file if available (progressive or completed)
                    const hasSignedFile = document?.signed_file_path;
                    const endpoint = hasSignedFile ? 'download-signed' : 'download';
                    
                    const authData = localStorage.getItem('esign.auth');
                    const token = authData ? JSON.parse(authData).tokens?.accessToken : null;
                    
                    const response = await fetch(`${apiUrl}/documents/${documentId}/${endpoint}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (!response.ok) throw new Error('Download failed');
                    
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = window.document.createElement('a');
                    a.href = url;
                    
                    // Add status to filename
                    const statusLabel = document?.status === 'completed' ? 'hoan-thanh' : 'dang-ky';
                    const filename = hasSignedFile 
                      ? `${document.document_number || 'document'}-${statusLabel}.pdf`
                      : `${document.document_number || 'document'}.pdf`;
                    
                    a.download = filename;
                    window.document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    window.document.body.removeChild(a);
                  } catch (error) {
                    console.error('Download error:', error);
                    alert('Không thể tải xuống file');
                  }
                }}
              >
                <Download className="h-4 w-4 shrink-0 sm:mr-2" />
                Tải xuống {document?.signed_file_path ? (document?.status === 'completed' ? '(Hoàn thành)' : '(Đang ký)') : ''}
              </Button>
            </div>
          </div>

          <div className={hasWorkflowSteps ? "mt-4 space-y-4" : "hidden"}>
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Tiến độ: {completedSteps}/{steps.length} bước
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Phase Indicators */}
          <div className="flex gap-2">
            {phases.map((phase: any) => (
              <div
                key={phase.key}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center ${
                  phase.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : phase.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-700'
                    : phase.status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {phase.label}
              </div>
            ))}
          </div>
            </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <WorkflowStatusPanel summary={flowData.status_summary} />
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Timeline */}
          <div className={hasWorkflowSteps ? "lg:col-span-3" : "hidden"}>
            <FlowTimeline
              steps={steps}
              canApprove={can_approve}
              canSign={can_sign}
            />
          </div>

          {/* Center: Document Viewer - Larger */}
          <div className={hasWorkflowSteps ? "lg:col-span-6" : "lg:col-span-8"}>
            {pdfUrl && (
              <SimplePDFViewer 
                key={`${documentId}-${flowData?.document?.signed_file_path || 'original'}`}
                pdfUrl={pdfUrl} 
              />
            )}
          </div>

          {/* Right: Activities & Participants */}
          <div className={hasWorkflowSteps ? "lg:col-span-3" : "lg:col-span-4"}>
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Tabs */}
              <div className="border-b">
                <div className="grid grid-cols-3">
                  <button
                    onClick={() => setActiveTab('activities')}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${
                      activeTab === 'activities'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Hoạt động
                  </button>
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${
                      activeTab === 'participants'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Người tham gia
                  </button>
                  {document.sign_request_id ? (
                    <button
                      onClick={() => setActiveTab('discussion')}
                      className={`px-3 py-3 text-sm font-medium ${
                        activeTab === 'discussion'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Thảo luận
                    </button>
                  ) : <div />}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'activities' ? (
                  <FlowActivities activities={activities} />
                ) : activeTab === 'participants' ? (
                  <FlowParticipants steps={steps} />
                ) : (
                  <SignRequestDiscussion signRequestId={document.sign_request_id} className="border-0 p-0 shadow-none" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Hủy yêu cầu ký</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Request sẽ bị hủy cho toàn bộ người tham gia. Lịch sử xử lý vẫn được giữ lại.
            </p>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy request"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason('');
              }}
            >
              Đóng
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelMutation.isPending || !cancelReason.trim()}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chia sẻ tài liệu đã hoàn thành</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
              Chỉ tài liệu đã hoàn thành mới được chia sẻ. Quyền mặc định của share là <strong>xem và tải xuống</strong>.
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Loại đối tượng</div>
              <select
                value={shareForm.subject_type}
                onChange={(event) =>
                  setShareForm((current) => ({
                    ...current,
                    subject_type: event.target.value as 'user' | 'department' | 'position_in_department',
                    subject_id: '',
                    scope_department_id: '',
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="user">Người dùng</option>
                <option value="department">Phòng ban</option>
                <option value="position_in_department">Chức danh trong phòng ban</option>
              </select>
            </div>

            {shareForm.subject_type === 'user' && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Người dùng</div>
                <select
                  value={shareForm.subject_id}
                  onChange={(event) => setShareForm((current) => ({ ...current, subject_id: event.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="">-- Chọn người dùng --</option>
                  {shareUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {shareForm.subject_type === 'department' && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Phòng ban</div>
                <select
                  value={shareForm.subject_id}
                  onChange={(event) => setShareForm((current) => ({ ...current, subject_id: event.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="">-- Chọn phòng ban --</option>
                  {shareDepartments.map((department: ShareDepartmentOption) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {shareForm.subject_type === 'position_in_department' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Phòng ban</div>
                  <select
                    value={shareForm.scope_department_id}
                    onChange={(event) => setShareForm((current) => ({ ...current, scope_department_id: event.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {shareDepartments.map((department: ShareDepartmentOption) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Chức danh</div>
                  <select
                    value={shareForm.subject_id}
                    onChange={(event) => setShareForm((current) => ({ ...current, subject_id: event.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">-- Chọn chức danh --</option>
                    {sharePositions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}{position.code ? ` (${position.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="text-sm font-medium">Quyền chia sẻ</div>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={shareForm.can_read}
                  onChange={(event) => setShareForm((current) => ({ ...current, can_read: event.target.checked }))}
                  className="h-4 w-4"
                />
                <span>Xem và tải xuống</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={shareForm.can_share}
                  onChange={(event) => setShareForm((current) => ({ ...current, can_share: event.target.checked }))}
                  className="h-4 w-4"
                />
                <span>Quyền chia sẻ</span>
              </label>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Đã chia sẻ</div>
              {sharePermissions.length === 0 ? (
                <div className="text-sm text-muted-foreground">Tài liệu này chưa có bản chia sẻ nào.</div>
              ) : (
                <div className="space-y-2">
                  {sharePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">Share</Badge>
                          <span className="text-sm font-medium">{getShareSubjectLabel(permission)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {permission.can_read && <Badge variant="outline">Xem và tải xuống</Badge>}
                          {permission.can_share && <Badge variant="outline">Quyền chia sẻ</Badge>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => revokeShareMutation.mutate(permission)}
                        disabled={revokeShareMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Đóng
            </Button>
            <Button
              onClick={() => grantShareMutation.mutate()}
              disabled={
                grantShareMutation.isPending ||
                !shareForm.subject_id ||
                !shareForm.can_read ||
                (shareForm.subject_type === 'position_in_department' && !shareForm.scope_department_id)
              }
            >
              {grantShareMutation.isPending ? 'Đang chia sẻ...' : 'Chia sẻ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
