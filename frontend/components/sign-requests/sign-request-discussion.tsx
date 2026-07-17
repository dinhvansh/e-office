'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, MessageSquare, Paperclip, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Attachment = { id: number; file_name: string; file_size?: string | null };
type DiscussionComment = { id: number; body: string; created_at: string; user?: { id: number; full_name?: string | null; email?: string | null } | null; attachments?: Attachment[] };
const toBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file); });

export function SignRequestDiscussion({ signRequestId, documentId, className = '' }: { signRequestId: number; documentId?: number; className?: string }) {
  const { fetchJson } = useAuth();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const { data, isLoading: loading, refetch } = useQuery({ queryKey: ['sign-request-comments', signRequestId], queryFn: () => fetchJson<{ comments: DiscussionComment[] }>(`/sign-requests/${signRequestId}/comments`) });
  const comments = data?.comments || [];
  useEffect(() => { if (window.location.hash === '#discussion') document.getElementById('discussion')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []);
  const submit = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await fetchJson(`/sign-requests/${signRequestId}/comments`, { method: 'POST', body: JSON.stringify({ body: body.trim(), attachments: await Promise.all(files.map(async (file) => ({ file_name: file.name, file_type: file.type || undefined, file_base64: await toBase64(file) }))) }) });
      setBody(''); setFiles([]); await refetch(); toast.success('Đã gửi bình luận');
    } catch (error: any) { toast.error(error.message || 'Không thể gửi bình luận'); } finally { setPosting(false); }
  };
  return <section id="discussion" className={`scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm ${className}`}>
    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold text-slate-950"><MessageSquare className="h-4 w-4 text-slate-500" />Thảo luận</h2><span className="text-xs text-slate-500">{comments.length} bình luận</span></div>
    <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border bg-slate-50 p-3">{loading ? <div className="py-5 text-center text-sm text-slate-500">Đang tải thảo luận...</div> : comments.length === 0 ? <div className="py-5 text-center text-sm text-slate-500">Chưa có bình luận.</div> : comments.map((comment) => <article key={comment.id} className="rounded-lg border border-slate-100 bg-white p-3"><div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span className="font-medium text-slate-700">{comment.user?.full_name || comment.user?.email || 'Người dùng'}</span><time>{new Date(comment.created_at).toLocaleString('vi-VN')}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>{comment.attachments?.map((attachment) => <a key={attachment.id} href={documentId ? `/api-proxy/documents/${documentId}/attachments/${attachment.id}/download` : '#'} className="mt-2 flex items-center gap-2 text-xs font-medium text-blue-700 hover:underline"><Download className="h-3.5 w-3.5" />{attachment.file_name}</a>)}</article>)}</div>
    <div className="mt-3 space-y-2"><Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Viết bình luận cho luồng phê duyệt/ký..." /><div className="flex items-center justify-between gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Paperclip className="h-4 w-4" />Đính kèm{files.length ? ` (${files.length})` : ''}<input className="sr-only" type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} /></label>{files.length ? <span className="truncate text-xs text-slate-500">{files.map((file) => file.name).join(', ')}</span> : null}</div><Button onClick={submit} disabled={posting || !body.trim()} className="w-full"><Send className="mr-2 h-4 w-4" />{posting ? 'Đang gửi...' : 'Gửi bình luận'}</Button></div>
  </section>;
}
