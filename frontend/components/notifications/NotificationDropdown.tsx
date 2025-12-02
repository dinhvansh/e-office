'use client';

import { Notification } from '@/lib/notifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface NotificationDropdownProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
}

export function NotificationDropdown({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationDropdownProps) {
  if (loading) {
    return (
      <div className="w-96 p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="w-96 p-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Không có thông báo</p>
          <p className="text-xs text-gray-500 mt-1">Bạn đã xem hết thông báo</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="w-96 max-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900">Thông báo</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Đánh dấu đã đọc
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y group">
          {notifications.map((notification) => (
            <div key={notification.id} className="group">
              <NotificationItem
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50">
        <Link href="/notifications">
          <Button variant="ghost" size="sm" className="w-full text-sm text-blue-600 hover:text-blue-700">
            Xem tất cả thông báo
          </Button>
        </Link>
      </div>
    </div>
  );
}
