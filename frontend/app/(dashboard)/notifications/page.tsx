'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { AsyncEmptyState, AsyncErrorState, AsyncListSkeleton, AsyncStatus } from '@/components/ui/async-state';
import { Button } from '@/components/ui/button';
import { DashboardHeaderPortal } from '@/components/ui/dashboard-header-portal';
import { deleteNotification, getNotifications, markAllAsRead, markAsRead, type Notification } from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const PAGE_SIZE = 20;

function safeDestination(link?: string) {
  return link && link.startsWith('/') && !link.startsWith('//') ? link : null;
}

export default function NotificationsPage() {
  const { fetchJson } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState('');
  const queryKey = ['notifications-history', page];
  const { data, isLoading, isError, refetch } = useQuery({ queryKey, queryFn: () => getNotifications(fetchJson, page, PAGE_SIZE), staleTime: 0, retry: false });
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['notifications-history'] }); };
  const markOne = useMutation({ mutationFn: (id: number) => markAsRead(fetchJson, id), onSuccess: async () => { setFeedback('Đã đánh dấu thông báo là đã đọc.'); await refresh(); } });
  const markAll = useMutation({ mutationFn: () => markAllAsRead(fetchJson), onSuccess: async () => { setFeedback('Đã đánh dấu tất cả thông báo là đã đọc.'); await refresh(); } });
  const remove = useMutation({ mutationFn: (id: number) => deleteNotification(fetchJson, id), onSuccess: async () => { setFeedback('Đã xóa thông báo.'); await refresh(); } });
  const notifications = data?.notifications || [];

  const open = async (notification: Notification) => {
    if (!notification.is_read) await markOne.mutateAsync(notification.id).catch(() => setFeedback('Không thể cập nhật trạng thái. Vui lòng thử lại.'));
    const destination = safeDestination(notification.link);
    if (destination) router.push(destination);
    else if (notification.link) setFeedback('Nội dung liên quan không còn khả dụng hoặc bạn không có quyền truy cập.');
  };

  return <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6" aria-live="polite">
    <AsyncStatus message={feedback || (isLoading ? 'Đang tải lịch sử thông báo.' : '')} />
    <DashboardHeaderPortal icon={Bell} title="Thông báo" description="Lịch sử thông báo của bạn" actions={<Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending || !notifications.some((item) => !item.is_read)}><CheckCheck className="mr-2 h-4 w-4" />Đánh dấu tất cả đã đọc</Button>} />
    {isLoading ? <AsyncListSkeleton rows={6} label="Đang tải lịch sử thông báo..." /> : isError ? <AsyncErrorState message="Không thể tải lịch sử thông báo. Vui lòng thử lại." onRetry={() => void refetch()} /> : notifications.length === 0 ? <AsyncEmptyState title="Chưa có thông báo" description="Các cập nhật dành cho bạn sẽ xuất hiện tại đây." /> : <section className="overflow-hidden rounded-lg border bg-card" aria-label="Danh sách thông báo">
      {notifications.map((notification) => <article key={notification.id} className={`flex gap-3 border-b p-4 last:border-0 ${notification.is_read ? '' : 'bg-blue-50/60'}`}>
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <button className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => void open(notification)}><p className="font-medium">{notification.title}</p>{notification.message ? <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p> : null}<p className="mt-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: vi })}{!notification.is_read ? ' · Chưa đọc' : ' · Đã đọc'}</p></button>
        <div className="flex shrink-0 items-start gap-1">{!notification.is_read ? <Button size="icon" variant="ghost" aria-label="Đánh dấu đã đọc" onClick={() => markOne.mutate(notification.id)} disabled={markOne.isPending}><CheckCheck className="h-4 w-4" /></Button> : null}<Button size="icon" variant="ghost" aria-label="Xóa thông báo" onClick={() => remove.mutate(notification.id)} disabled={remove.isPending}><Trash2 className="h-4 w-4" /></Button></div>
      </article>)}
    </section>}
    {data && data.totalPages > 1 ? <nav className="flex items-center justify-between" aria-label="Phân trang thông báo"><Button variant="outline" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}><ChevronLeft className="mr-1 h-4 w-4" />Trước</Button><span className="text-sm text-muted-foreground">Trang {data.page} / {data.totalPages}</span><Button variant="outline" onClick={() => setPage((value) => value + 1)} disabled={page >= data.totalPages}>Sau<ChevronRight className="ml-1 h-4 w-4" /></Button></nav> : null}
  </div>;
}
