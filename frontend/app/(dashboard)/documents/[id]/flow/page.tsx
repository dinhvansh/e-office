'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { FlowTimeline } from '@/components/flow/FlowTimeline';
import { FlowActivities } from '@/components/flow/FlowActivities';
import SimplePDFViewer from '@/components/pdf/SimplePDFViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, ChevronsUpDown, FileText, Download, RefreshCw, Share2, Trash2, History, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WorkflowStatusPanel } from '@/components/workflow/WorkflowStatusPanel';
import { SignRequestDiscussion } from '@/components/sign-requests/sign-request-discussion';
import { DossierAttachments } from '@/components/documents/dossier-attachments';
import { DocumentDownloadMenu } from '@/components/documents/document-download-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ComboboxSelect } from '@/components/ui/combobox-select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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
  avatar_url?: string | null;
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

function getInitials(name?: string, email?: string) {
  const source = (name || email || '?').trim();
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function UserShareCombobox({
  users,
  value,
  onChange,
}: {
  users: ShareUserOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedUser = users.find((user) => String(user.id) === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-11 w-full justify-between px-3 font-normal">
          {selectedUser ? (
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar user={selectedUser} />
              <span className="min-w-0 truncate">{selectedUser.full_name || selectedUser.email}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Chọn người dùng...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" portalled={false}>
        <Command>
          <CommandInput placeholder="Tìm theo tên hoặc email..." />
          <CommandEmpty>Không tìm thấy người dùng phù hợp.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto p-1">
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.full_name || ''} ${user.email}`}
                onSelect={() => {
                  onChange(String(user.id));
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5"
              >
                <UserAvatar user={user} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{user.full_name || user.email}</span>
                  <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                </span>
                <Check className={cn('h-4 w-4 text-primary', String(user.id) === value ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function UserAvatar({ user }: { user: ShareUserOption }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {user.avatar_url && !imageFailed ? (
        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
      ) : getInitials(user.full_name, user.email) || <UserRound className="h-4 w-4" />}
    </span>
  );
}

export default function DocumentFlowPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const documentId = params.id as string;
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareForm, setShareForm] = useState({
    subject_type: 'user' as 'user' | 'department' | 'position_in_department',
    subject_id: '',
    scope_department_id: '',
    can_read: true,
    can_share: false,
  });

  // Fetch flow data with auto-refresh to show new signatures
  const { data: flowData, isLoading, refetch, dataUpdatedAt } = useQuery<any>({
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const signRequestId = flowData?.document?.sign_request_id;
      if (!signRequestId) throw new Error('Không tìm thấy request để xóa');
      await fetchJson(`/sign-requests/${signRequestId}`, { method: 'DELETE' });
      await fetchJson(`/documents/${documentId}`, { method: 'DELETE' });
    },
    onSuccess: () => { toast.success('Đã xóa request và tài liệu'); router.push('/sign-requests'); },
    onError: (error: any) => toast.error(error?.message || 'Không thể xóa request'),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const signRequestId = flowData?.document?.sign_request_id;
      if (!signRequestId) throw new Error('Không tìm thấy request để thu hồi');
      return fetchJson(`/sign-requests/${signRequestId}/revoke`, { method: 'POST' });
    },
    onSuccess: () => { toast.success('Đã thu hồi tài liệu'); refetch(); },
    onError: (error: any) => toast.error(error?.message || 'Không thể thu hồi tài liệu'),
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
  const canCancel = canManageSignRequest && ['pending_approval', 'pending_signature', 'in_progress'].includes(document.status);
  const canDelete = canManageSignRequest && ['draft', 'cancelled'].includes(document.status);
  const canRevoke = canManageSignRequest && document.status === 'completed';
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
              <DocumentDownloadMenu documentId={Number(documentId)} documentNumber={document.document_number} originalFileName={document.original_file_name} status={document.status} signedFilePath={document.signed_file_path} />
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
              {canRevoke && (
                <Button variant="outline" size="sm" onClick={() => { if (window.confirm('Thu hồi tài liệu hoàn thành?')) revokeMutation.mutate(); }} disabled={revokeMutation.isPending}>
                  {revokeMutation.isPending ? 'Đang thu hồi...' : 'Thu hồi'}
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} disabled={deleteMutation.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />{deleteMutation.isPending ? 'Đang xóa...' : 'Xóa request'}
                </Button>
              )}
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

          {/* Right: discussion and audit activity. Participant state is already shown in the workflow timeline. */}
          <div className={hasWorkflowSteps ? "lg:col-span-3" : "lg:col-span-4"}>
            <div className="space-y-6">
              {document.sign_request_id ? <SignRequestDiscussion signRequestId={document.sign_request_id} documentId={Number(documentId)} readOnly={isCompleted} /> : null}
              <DossierAttachments documentId={Number(documentId)} readOnly={isCompleted} />
              <section className="rounded-lg border bg-white shadow-sm">
                <div className="border-b px-4 py-3 text-sm font-semibold text-slate-900">Hoạt động</div>
                <div className="p-4">
                  <FlowActivities activities={activities} />
                </div>
              </section>
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
              <ComboboxSelect
                value={shareForm.subject_type}
                onChange={(value) =>
                  setShareForm((current) => ({
                    ...current,
                    subject_type: value as 'user' | 'department' | 'position_in_department',
                    subject_id: '',
                    scope_department_id: '',
                  }))
                }
                options={[
                  { value: 'user', label: 'Người dùng' },
                  { value: 'department', label: 'Phòng ban' },
                  { value: 'position_in_department', label: 'Chức danh trong phòng ban' },
                ]}
                searchPlaceholder="Tìm loại đối tượng..."
                portalled={false}
              />
            </div>

            {shareForm.subject_type === 'user' && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Người dùng</div>
                <UserShareCombobox
                  users={shareUsers}
                  value={shareForm.subject_id}
                  onChange={(value) => setShareForm((current) => ({ ...current, subject_id: value }))}
                />
              </div>
            )}

            {shareForm.subject_type === 'department' && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Phòng ban</div>
                <ComboboxSelect
                  value={shareForm.subject_id}
                  onChange={(value) => setShareForm((current) => ({ ...current, subject_id: String(value) }))}
                  options={shareDepartments.map((department: ShareDepartmentOption) => ({ value: String(department.id), label: department.name }))}
                  placeholder="Chọn phòng ban..."
                  searchPlaceholder="Tìm phòng ban..."
                  portalled={false}
                />
              </div>
            )}

            {shareForm.subject_type === 'position_in_department' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Phòng ban</div>
                  <ComboboxSelect
                    value={shareForm.scope_department_id}
                    onChange={(value) => setShareForm((current) => ({ ...current, scope_department_id: String(value) }))}
                    options={shareDepartments.map((department: ShareDepartmentOption) => ({ value: String(department.id), label: department.name }))}
                    placeholder="Chọn phòng ban..."
                    searchPlaceholder="Tìm phòng ban..."
                    portalled={false}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Chức danh</div>
                  <ComboboxSelect
                    value={shareForm.subject_id}
                    onChange={(value) => setShareForm((current) => ({ ...current, subject_id: String(value) }))}
                    options={sharePositions.map((position) => ({ value: String(position.id), label: `${position.name}${position.code ? ` (${position.code})` : ''}` }))}
                    placeholder="Chọn chức danh..."
                    searchPlaceholder="Tìm chức danh..."
                    portalled={false}
                  />
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
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => deleteMutation.mutate()}
        title="Xóa request"
        description="Request và tài liệu liên quan sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmText="Xóa request"
        cancelText="Hủy bỏ"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
