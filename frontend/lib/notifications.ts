// Notification API client

export interface Notification {
  id: number;
  tenant_id: number;
  user_id: number;
  type: string;
  title: string;
  message?: string;
  link?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  count: number;
}

export async function getNotifications(
  fetchJson: any,
  page = 1,
  limit = 10,
  unreadOnly = false
): Promise<NotificationListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(unreadOnly && { unreadOnly: 'true' }),
  });

  return fetchJson(`/notifications?${params}`);
}

export async function getUnreadCount(fetchJson: any): Promise<number> {
  const response: UnreadCountResponse = await fetchJson('/notifications/unread-count');
  return response.count;
}

export async function markAsRead(fetchJson: any, id: number): Promise<void> {
  await fetchJson(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllAsRead(fetchJson: any): Promise<void> {
  await fetchJson('/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function deleteNotification(fetchJson: any, id: number): Promise<void> {
  await fetchJson(`/notifications/${id}`, {
    method: 'DELETE',
  });
}
