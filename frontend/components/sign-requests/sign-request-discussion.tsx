'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Paperclip, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Comment = { id: number; body: string; created_at: string; deleted_at?: string | null; user?: { full_name?: string | null; email?: string | null } | null };
export function SignRequestDiscussion({ signRequestId, readOnly = false }: { signRequestId: number; documentId?: number; className?: string; readOnly?: boolean }) {
  const { fetchJson } = useAuth(); const [body, setBody] = useState(''); const [posting, setPosting] = useState(false);
  const { data, isLoading, refetch } = useQuery({ queryKey: ['sign-request-comments', signRequestId], queryFn: () => fetchJson<{ comments: Comment[] }>(`/sign-requests/${signRequestId}/comments`) });
  const submit = async () => { if (!body.trim() || readOnly) return; setPosting(true); try { await fetchJson(`/sign-requests/${signRequestId}/comments`, { method: 'POST', body: JSON.stringify({ body: body.trim() }) }); setBody(''); await refetch(); toast.success('Đã gửi bình luận'); } catch (error: any) { toast.error(error.message || 'Không thể gửi bình luận'); } finally { setPosting(false); } };
  const comments = data?.comments || [];
  return <section className="rounded-xl border bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4" />Thảo luận</h2><span className="text-xs text-slate-500">{comments.length} bình luận</span></div><div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border bg-slate-50 p-3">{isLoading ? <p className="text-sm text-slate-500">Đang tải...</p> : comments.length ? comments.map((comment) => <article key={comment.id} className="rounded border bg-white p-3"><p className="text-xs text-slate-500">{comment.user?.full_name || comment.user?.email || 'Người dùng'} · {new Date(comment.created_at).toLocaleString('vi-VN')}</p><p className="mt-1 text-sm">{comment.deleted_at ? 'Bình luận đã được thu hồi' : comment.body}</p></article>) : <p className="text-sm text-slate-500">Chưa có bình luận.</p>}</div>{readOnly ? <p className="mt-3 text-xs text-slate-500">Tài liệu đã hoàn thành — chỉ xem lịch sử thảo luận.</p> : <div className="mt-3 space-y-2"><Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Viết bình luận cho luồng phê duyệt/ký..." /><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-xs text-slate-500"><Paperclip className="h-4 w-4" />Có thể đính kèm khi tài liệu đang xử lý</span><Button onClick={submit} disabled={posting || !body.trim()}><Send className="mr-2 h-4 w-4" />Gửi bình luận</Button></div></div>}</section>;
}
