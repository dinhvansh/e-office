'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Download, FileText, MessageSquare, RefreshCw, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PDFCanvasViewer } from '@/components/pdf/PDFCanvasViewer';
import SignatureModal from '@/components/signature/SignatureModal';
import { getApiBaseUrl } from '@/lib/env';

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
    sign_request_id?: number | null;
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

type ApprovalAction = 'approve' | 'reject' | 'request_info';

const actionLabels: Record<ApprovalAction, string> = {
  approve: 'Phê duyệt',
  reject: 'Từ chối',
  request_info: 'Yêu cầu bổ sung',
};

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson, user, tokens } = useAuth();
  const approvalId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [selectedAction, setSelectedAction] = useState<ApprovalAction | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | 'typed'>('drawn');
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const fileUrl = useMemo(() => `${getApiBaseUrl()}/approvals/${approvalId}/document/view`, [approvalId]);
  const isProcessed = approval ? approval.action !== 'pending' : false;
  const hasDiscussion = Boolean(approval?.document.sign_request_id);

  useEffect(() => {
    fetchApprovalDetail();
  }, [approvalId]);

  useEffect(() => {
    if (approval) {
      fetchComments();
    }
  }, [approval?.id, approval?.document.sign_request_id]);

  const fetchApprovalDetail = async () => {
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
  };

  const fetchComments = async () => {
    try {
      const data = await fetchJson<{ comments: DiscussionComment[] }>(`/approvals/${approvalId}/comments`);
      setComments(data.comments || []);
    } catch {
      setComments([]);
    }
  };

  const handleActionClick = (actionType: ApprovalAction) => {
    setSelectedAction(actionType);
    if (actionType === 'approve') {
      setShowSignatureModal(true);
    }
  };

  const handleSignatureConfirm = (data: string, type: 'drawn' | 'uploaded' | 'typed') => {
    setSignatureData(data);
    setSignatureType(type);
    setShowSignatureModal(false);
    toast.success('Đã tạo chữ ký');
  };

  const handleSubmitAction = async () => {
    if (!selectedAction) return;

    if (selectedAction === 'approve' && !signatureData) {
      toast.error('Vui lòng tạo chữ ký trước khi phê duyệt');
      setShowSignatureModal(true);
      return;
    }

    if ((selectedAction === 'reject' || selectedAction === 'request_info') && !actionComment.trim()) {
      toast.error('Vui lòng nhập lý do');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = `/approvals/${approvalId}/${selectedAction.replace('_', '-')}`;
      const body: any = { comment: actionComment.trim() || undefined };

      if (selectedAction === 'approve') {
        body.signature_data = signatureData;
        body.signature_type = signatureType;
      }

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
    setSignatureData('');
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <button onClick={() => router.push('/my-tasks')} className="mb-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              Quay lại công việc
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-semibold text-slate-950">Phê duyệt tài liệu</h1>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                Bước {approval.workflow_step.step_order}: {approval.workflow_step.step_name}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${isProcessed ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'}`}>
                {isProcessed ? 'Đã xử lý' : 'Đang chờ xử lý'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{approval.workflow.name}</p>
          </div>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Tải xuống
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-5 xl:grid-cols-[1fr_360px]">
        <main className="space-y-5">
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
          </section>

          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
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
            <div className="h-[760px] bg-slate-100">
              <PDFCanvasViewer
                fileUrl={fileUrl}
                token={tokens?.accessToken || ''}
                fields={[]}
                signers={[]}
              />
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-950">Hành động phê duyệt</h2>

            {!isProcessed && !selectedAction && (
              <div className="space-y-3">
                <Button onClick={() => handleActionClick('approve')} className="h-11 w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Phê duyệt
                </Button>
                <Button onClick={() => handleActionClick('reject')} variant="destructive" className="h-11 w-full">
                  <XCircle className="mr-2 h-4 w-4" />
                  Từ chối
                </Button>
                <Button onClick={() => handleActionClick('request_info')} variant="outline" className="h-11 w-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Yêu cầu bổ sung
                </Button>
              </div>
            )}

            {!isProcessed && selectedAction && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <span className="text-slate-500">Đang chọn:</span>{' '}
                  <span className="font-medium text-slate-950">{actionLabels[selectedAction]}</span>
                </div>

                {selectedAction === 'approve' && signatureData && (
                  <div className="rounded-xl border p-4">
                    <Label>Chữ ký phê duyệt</Label>
                    <img src={signatureData} alt="Signature" className="mx-auto mt-3 max-h-24" />
                    <Button onClick={() => setShowSignatureModal(true)} variant="outline" size="sm" className="mt-3 w-full">
                      Thay đổi chữ ký
                    </Button>
                  </div>
                )}

                {selectedAction === 'approve' && !signatureData && (
                  <Button onClick={() => setShowSignatureModal(true)} variant="outline" className="w-full">
                    Tạo chữ ký
                  </Button>
                )}

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
                <div>Trạng thái: <strong>{approval.action === 'approved' ? 'Đã phê duyệt' : approval.action === 'rejected' ? 'Đã từ chối' : 'Yêu cầu bổ sung'}</strong></div>
                {approval.comment && <div className="mt-2">Nhận xét: {approval.comment}</div>}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
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

      <SignatureModal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onConfirm={handleSignatureConfirm}
        signerName={user?.email || 'User'}
      />
    </div>
  );
}
