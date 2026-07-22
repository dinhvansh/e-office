'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Download, FileText, MessageSquare, Paperclip, RefreshCw, Send, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SimplePDFViewer from '@/components/pdf/SimplePDFViewer';
import { getApiBaseUrl } from '@/lib/env';
import { WorkflowStatusPanel, type WorkflowStatusSummary } from '@/components/workflow/WorkflowStatusPanel';
import { DossierAttachments } from '@/components/documents/dossier-attachments';
import { SignRequestDiscussion } from '@/components/sign-requests/sign-request-discussion';
import { DocumentDownloadMenu } from '@/components/documents/document-download-menu';
import { FlowTimeline } from '@/components/flow/FlowTimeline';
import { DashboardHeaderPortal as PageHeader } from '@/components/ui/dashboard-header-portal';

interface ApprovalDetail {
  id: number;
  action: string;
  comment: string | null;
  created_at: string;
  acted_at: string | null;
  workflow: {
    id: number;
    name: string;
    description: string | null;
  };
  document: {
    id: number;
    title: string | null;
    original_file_name: string | null;
    tenant_id: number;
    document_number?: string | null;
    status?: string | null;
    signed_file_path?: string | null;
    sign_request_id?: number | null;
    revision_no?: number | null;
    revision_comment?: string | null;
    owner: {
      id: number;
      full_name: string | null;
      email: string;
    };
  };
  approver: {
    id: number;
    full_name: string | null;
    email: string;
  };
  workflow_step: {
    id: number;
    step_order: number;
    step_name: string;
    approver_type: string;
  };
  status_summary?: WorkflowStatusSummary;
}

interface DiscussionComment {
  id: number;
  body: string;
  created_at: string;
  user?: {
    id: number;
    full_name?: string | null;
    email?: string | null;
  } | null;
}

type ApprovalAction = 'approve' | 'reject';

const actionLabels: Record<ApprovalAction, string> = {
  approve: 'Phê duyệt',
  reject: 'Từ chối',
};

interface DocumentAttachment {
  id: number;
  file_name: string;
  file_size: string | null;
  file_type: string | null;
  uploaded_at: string;
}

interface WorkflowFlowStep {
  id: string;
  type: 'approval' | 'signing';
  order: number;
  sign_request_id?: number;
  user: { id: number; name: string; email: string } | null;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'signed' | 'info_requested';
  started_at?: string;
  completed_at?: string;
  comment?: string;
  signer_kind?: 'internal' | 'external';
}

interface WorkflowFlowData {
  steps: WorkflowFlowStep[];
  can_approve: boolean;
  can_sign: boolean;
}

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson, user, tokens } = useAuth();
  const approvalId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [selectedAction, setSelectedAction] = useState<ApprovalAction | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [workflowFlow, setWorkflowFlow] = useState<WorkflowFlowData | null>(null);

  const fileUrl = useMemo(() => `${getApiBaseUrl()}/approvals/${approvalId}/document/view`, [approvalId]);
  const isProcessed = approval ? approval.action !== 'pending' : false;
  const canUploadAttachment = !isProcessed;
  const hasDiscussion = Boolean(approval?.document.sign_request_id);

  const fetchApprovalDetail = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchJson<ApprovalDetail>(`/approvals/${approvalId}`);
      setApproval(data);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải thông tin phê duyệt');
      router.push('/my-tasks');
    } finally {
      setLoading(false);
    }
  }, [approvalId, fetchJson, router]);

  const fetchComments = useCallback(async () => {
    try {
      const data = await fetchJson<{ comments: DiscussionComment[] }>(`/approvals/${approvalId}/comments`);
      setComments(data.comments || []);
    } catch {
      setComments([]);
    }
  }, [approvalId, fetchJson]);

  const fetchAttachments = useCallback(async (documentId: number) => {
    try {
      const data = await fetchJson<{ attachments: DocumentAttachment[] }>(`/documents/${documentId}/attachments`);
      setAttachments(data.attachments || []);
    } catch {
      setAttachments([]);
    }
  }, [fetchJson]);

  const fetchWorkflowFlow = useCallback(async (documentId: number) => {
    try {
      const data = await fetchJson<WorkflowFlowData>(`/documents/${documentId}/flow`);
      setWorkflowFlow(data);
    } catch {
      // The approval itself remains usable if a legacy document cannot expose
      // its full flow. Do not turn a supplemental panel into a blocking error.
      setWorkflowFlow(null);
    }
  }, [fetchJson]);

  useEffect(() => {
    void Promise.resolve().then(fetchApprovalDetail);
  }, [fetchApprovalDetail]);

  useEffect(() => {
    const documentId = approval?.document.id;
    if (documentId) {
      void Promise.resolve().then(() => Promise.all([fetchComments(), fetchAttachments(documentId), fetchWorkflowFlow(documentId)]));
    }
  }, [approval?.id, approval?.document.id, approval?.document.sign_request_id, fetchAttachments, fetchComments, fetchWorkflowFlow]);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !approval?.document.id) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File đính kèm tối đa 10MB');
      return;
    }

    setUploadingAttachment(true);
    try {
      await fetchJson(`/documents/${approval.document.id}/attachments`, {
        method: 'POST',
        body: JSON.stringify({
          file_name: file.name,
          file_base64: await fileToBase64(file),
          file_type: file.type || 'application/octet-stream',
        }),
      });
      await fetchAttachments(approval.document.id);
      toast.success('Đã thêm file đính kèm');
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải file đính kèm');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDownloadAttachment = async (attachment: DocumentAttachment) => {
    if (!approval?.document.id) return;
    try {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No token');

      const response = await fetch(`${getApiBaseUrl()}/documents/${approval.document.id}/attachments/${attachment.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    } catch {
      toast.error('Không thể tải file đính kèm');
    }
  };

  const formatAttachmentSize = (size: string | null) => {
    if (!size) return '';
    const bytes = Number(size);
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleActionClick = (actionType: ApprovalAction) => {
    setSelectedAction(actionType);
  };

  const handleSubmitAction = async () => {
    if (!selectedAction) return;

    if (selectedAction === 'reject' && !actionComment.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = `/approvals/${approvalId}/${selectedAction.replace('_', '-')}`;
      const body = { comment: actionComment.trim() || undefined };

      await fetchJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      toast.success(`${actionLabels[selectedAction]} thành công`);
      router.push('/my-tasks');
    } catch (error: any) {
      toast.error(error.message || 'Không thể xử lý phê duyệt');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostComment = async () => {
    const content = commentBody.trim();
    if (!content) return;

    setPostingComment(true);
    try {
      await fetchJson(`/approvals/${approvalId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: content }),
      });
      setCommentBody('');
      await fetchComments();
      toast.success('Đã gửi bình luận');
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi bình luận');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDownload = async () => {
    try {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No token');

      const response = await fetch(`${getApiBaseUrl()}/approvals/${approvalId}/document/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = approval?.document.original_file_name || 'document.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
      toast.success('Tải xuống thành công');
    } catch {
      toast.error('Không thể tải xuống');
    }
  };

  const resetAction = () => {
    setSelectedAction(null);
    setActionComment('');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-red-600">Không tìm thấy yêu cầu phê duyệt</p>
      </div>
    );
  }

  const workflowSteps = workflowFlow?.steps || [];
  const hasWorkflowSteps = workflowSteps.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileText}
        title="Phê duyệt tài liệu"
        description={`${approval.workflow.name} · Bước ${approval.workflow_step.step_order}: ${approval.workflow_step.step_name}`}
        actions={<DocumentDownloadMenu documentId={approval.document.id} documentNumber={approval.document.document_number} originalFileName={approval.document.original_file_name} status={approval.document.status} signedFilePath={approval.document.signed_file_path} />}
      />
      <div className="flex items-center justify-between gap-3 md:hidden">
        <button onClick={() => router.push('/my-tasks')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Quay lại công việc</button>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${isProcessed ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'}`}>{isProcessed ? 'Đã xử lý' : 'Đang chờ xử lý'}</span>
      </div>
      <div className={`grid grid-cols-1 gap-5 ${hasWorkflowSteps ? 'xl:grid-cols-[280px_minmax(0,1fr)_360px]' : 'xl:grid-cols-[minmax(0,1fr)_360px]'}`}>
        {hasWorkflowSteps ? (
          <aside className="min-w-0">
            <FlowTimeline
              steps={workflowSteps}
              canApprove={Boolean(workflowFlow?.can_approve)}
              canSign={Boolean(workflowFlow?.can_sign)}
              currentUserId={user?.id}
            />
          </aside>
        ) : null}
        <main className="min-w-0 space-y-5">
          <WorkflowStatusPanel summary={approval.status_summary} />
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <FileText className="h-4 w-4" />
                  Thông tin tài liệu
                </div>
                <h2 className="text-lg font-semibold text-slate-950">{approval.document.title || approval.document.original_file_name}</h2>
                <p className="mt-1 text-sm text-slate-500">{approval.document.original_file_name}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <div className="font-medium text-slate-700">Người tạo</div>
                <div className="mt-1 text-slate-950">{approval.document.owner.full_name || approval.document.owner.email}</div>
                <div className="text-xs text-slate-500">{approval.document.owner.email}</div>
              </div>
            </div>
            {approval.document.revision_comment ? <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"><p className="text-sm font-medium text-blue-950">Ghi chú thay thế phiên bản</p><p className="mt-1 text-sm text-blue-800">{approval.document.revision_comment}</p></div> : null}
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-950">Xem trước tài liệu</h2>
                <p className="text-xs text-slate-500">Viewer thống nhất với màn trình ký, không dùng toolbar PDF của trình duyệt.</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchApprovalDetail}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Làm mới
              </Button>
            </div>
            <div className="h-[760px] min-h-0 min-w-0 overflow-hidden bg-slate-100">
              <SimplePDFViewer pdfUrl={fileUrl} />
            </div>
          </section>
        </main>

        <aside className="flex min-w-0 flex-col gap-5">
          <section className="order-1 rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-950">Hành động phê duyệt</h2>

            {!isProcessed && !selectedAction && (
              <div className="space-y-2">
                <Button onClick={() => handleActionClick('approve')} className="h-10 w-full">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Phê duyệt
                </Button>
                <Button onClick={() => handleActionClick('reject')} variant="outline" className="h-10 w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Từ chối
                </Button>
              </div>
            )}

            {!isProcessed && selectedAction && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <span className="text-slate-500">Đang chọn:</span>{' '}
                  <span className="font-medium text-slate-950">{actionLabels[selectedAction]}</span>
                </div>

                <div>
                  <Label>Nhận xét</Label>
                  <Textarea
                    value={actionComment}
                    onChange={(event) => setActionComment(event.target.value)}
                    rows={4}
                    className="mt-1"
                    placeholder="Nhập nhận xét hoặc lý do xử lý..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSubmitAction} disabled={submitting} className="flex-1">
                    {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                  </Button>
                  <Button onClick={resetAction} variant="outline" disabled={submitting}>Hủy</Button>
                </div>
              </div>
            )}

            {isProcessed && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <div>Trạng thái: <strong>{approval.action === 'approved' ? 'Đã phê duyệt' : approval.action === 'rejected' ? 'Đã từ chối' : 'Đã xử lý'}</strong></div>
                {approval.comment && <div className="mt-2">Nhận xét: {approval.comment}</div>}
              </div>
            )}
          </section>

          <DossierAttachments documentId={approval.document.id} />

          <section className="hidden order-3 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold text-slate-950">
                <Paperclip className="h-4 w-4" />
                Tài liệu đính kèm
              </h2>
              {canUploadAttachment ? <Label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <Upload className="mr-2 h-4 w-4" />
                {uploadingAttachment ? 'Đang tải...' : 'Thêm tệp đính kèm'}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleAttachmentUpload}
                  disabled={uploadingAttachment}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
              </Label> : null}
            </div>

            <p className="mb-3 text-xs text-slate-500">
              File đính kèm chỉ được thêm mới để bổ sung hồ sơ, không thay thế hoặc xóa tài liệu gốc.
            </p>

            <div className="space-y-2">
              {attachments.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có file đính kèm.</div>
              ) : (
                attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    onClick={() => handleDownloadAttachment(attachment)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">{attachment.file_name}</span>
                      <span className="text-xs text-slate-500">{formatAttachmentSize(attachment.file_size)}</span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))
              )}
            </div>
          </section>

          {approval.document.sign_request_id ? <SignRequestDiscussion signRequestId={approval.document.sign_request_id} activeApprovalId={approval.id} documentId={approval.document.id} readOnly={isProcessed} /> : null}
          <section className="hidden order-2 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-slate-950">
                <MessageSquare className="h-4 w-4" />
                Thảo luận
              </h2>
              {hasDiscussion && <span className="text-xs text-slate-500">{comments.length} bình luận</span>}
            </div>

            {!hasDiscussion ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Tài liệu này chưa có luồng ký nên chưa có thảo luận chung.
              </div>
            ) : (
              <>
                <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border bg-slate-50 p-3">
                  {comments.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">Chưa có bình luận.</div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="rounded-lg bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{comment.user?.full_name || comment.user?.email || 'Người dùng'}</span>
                          <span>{new Date(comment.created_at).toLocaleString('vi-VN')}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  <Textarea
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    rows={3}
                    placeholder="Nhập bình luận về luồng phê duyệt/ký..."
                  />
                  <Button onClick={handlePostComment} disabled={postingComment || !commentBody.trim()} className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    Gửi bình luận
                  </Button>
                </div>
              </>
            )}
          </section>
        </aside>
      </div>

    </div>
  );
}
