'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Paperclip, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type CommentAttachment = { id: number; file_name: string };
type Comment = {
  id: number;
  body: string;
  created_at: string;
  deleted_at?: string | null;
  user?: { full_name?: string | null; email?: string | null } | null;
  attachments?: CommentAttachment[];
};
type PendingAttachment = { file_name: string; file_base64: string; file_type?: string };

const asBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export function SignRequestDiscussion({
  signRequestId,
  activeApprovalId,
  readOnly = false,
}: {
  signRequestId: number;
  documentId?: number;
  className?: string;
  activeApprovalId?: number | null;
  readOnly?: boolean;
}) {
  const { fetchJson } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [posting, setPosting] = useState(false);

  // An assigned approver uses its approval task as the authority to read and
  // write the shared discussion. Request owners retain the existing endpoint.
  const commentsEndpoint = activeApprovalId
    ? `/approvals/${activeApprovalId}/comments`
    : `/sign-requests/${signRequestId}/comments`;
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sign-request-comments', signRequestId, activeApprovalId || 'request-owner'],
    queryFn: () => fetchJson<{ comments: Comment[] }>(commentsEndpoint),
  });

  const selectFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const remaining = Math.max(0, 5 - attachments.length);
      const selected = await Promise.all(Array.from(files).slice(0, remaining).map(async (file) => ({
        file_name: file.name,
        file_base64: await asBase64(file),
        file_type: file.type || undefined,
      })));
      setAttachments((current) => [...current, ...selected]);
    } catch {
      toast.error('Không thể đọc tệp đính kèm');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const submit = async () => {
    if ((!body.trim() && attachments.length === 0) || readOnly) return;
    setPosting(true);
    try {
      await fetchJson(commentsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          body: body.trim() || 'Đính kèm tệp',
          attachments,
        }),
      });
      setBody('');
      setAttachments([]);
      await refetch();
      toast.success('Đã gửi bình luận');
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi bình luận');
    } finally {
      setPosting(false);
    }
  };

  const comments = data?.comments || [];
  return (
    <section id="discussion" className="min-w-0 rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4 shrink-0" />Thảo luận</h2>
        <span className="shrink-0 text-xs text-slate-500">{comments.length} bình luận</span>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border bg-slate-50 p-3">
        {isLoading ? <p className="text-sm text-slate-500">Đang tải...</p> : comments.length ? comments.map((comment) => (
          <article key={comment.id} className="rounded border bg-white p-3">
            <p className="text-xs text-slate-500">{comment.user?.full_name || comment.user?.email || 'Người dùng'} · {new Date(comment.created_at).toLocaleString('vi-VN')}</p>
            <p className="mt-1 text-sm">{comment.deleted_at ? 'Bình luận đã được thu hồi' : comment.body}</p>
            {comment.attachments?.length ? <p className="mt-2 text-xs text-slate-500">{comment.attachments.map((attachment) => attachment.file_name).join(', ')}</p> : null}
          </article>
        )) : <p className="text-sm text-slate-500">Chưa có bình luận.</p>}
      </div>
      {readOnly ? <p className="mt-3 text-xs text-slate-500">Tài liệu đã hoàn thành — chỉ xem lịch sử thảo luận.</p> : (
        <div className="mt-3 space-y-2">
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Viết bình luận cho luồng phê duyệt/ký..." />
          <input ref={inputRef} type="file" className="sr-only" multiple onChange={(event) => void selectFiles(event.target.files)} />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={posting || attachments.length >= 5}>
                <Paperclip className="mr-2 h-4 w-4" />Đính kèm
              </Button>
              {attachments.length ? <span>{attachments.map((attachment) => attachment.file_name).join(', ')}</span> : <span>Có thể đính kèm khi tài liệu đang xử lý</span>}
            </div>
            <Button className="w-full whitespace-nowrap" onClick={submit} disabled={posting || (!body.trim() && attachments.length === 0)}>
              <Send className="mr-2 h-4 w-4 shrink-0" />Gửi bình luận
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
