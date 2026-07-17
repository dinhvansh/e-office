'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type DiscussionComment = {
  id: number;
  body: string;
  created_at: string;
  user?: { id: number; full_name?: string | null; email?: string | null } | null;
};

export function SignRequestDiscussion({ signRequestId, className = '' }: { signRequestId: number; className?: string }) {
  const { fetchJson } = useAuth();
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['sign-request-comments', signRequestId],
    queryFn: async () => fetchJson<{ comments: DiscussionComment[] }>(`/sign-requests/${signRequestId}/comments`),
  });
  const comments = data?.comments || [];

  useEffect(() => {
    if (window.location.hash === '#discussion') {
      document.getElementById('discussion')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const submit = async () => {
    const content = body.trim();
    if (!content) return;
    setPosting(true);
    try {
      await fetchJson(`/sign-requests/${signRequestId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: content }),
      });
      setBody('');
      await refetch();
      toast.success('Đã gửi bình luận');
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi bình luận');
    } finally {
      setPosting(false);
    }
  };

  return (
    <section id="discussion" className={`scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-slate-950">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          Thảo luận
        </h2>
        <span className="text-xs text-slate-500">{comments.length} bình luận</span>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border bg-slate-50 p-3">
        {loading ? (
          <div className="py-5 text-center text-sm text-slate-500">Đang tải thảo luận...</div>
        ) : comments.length === 0 ? (
          <div className="py-5 text-center text-sm text-slate-500">Chưa có bình luận.</div>
        ) : comments.map((comment) => (
          <article key={comment.id} className="rounded-lg border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{comment.user?.full_name || comment.user?.email || 'Người dùng'}</span>
              <time>{new Date(comment.created_at).toLocaleString('vi-VN')}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Viết bình luận cho luồng phê duyệt/ký..." />
        <Button onClick={submit} disabled={posting || !body.trim()} className="w-full">
          <Send className="mr-2 h-4 w-4" />
          {posting ? 'Đang gửi...' : 'Gửi bình luận'}
        </Button>
      </div>
    </section>
  );
}
