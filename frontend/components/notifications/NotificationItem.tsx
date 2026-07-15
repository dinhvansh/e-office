'use client';

import { Notification } from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Info, 
  PenTool, 
  CheckCheck,
  PartyPopper,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
}

const notificationIcons: Record<string, any> = {
  approval_request: FileText,
  approval_approved: CheckCircle,
  approval_rejected: XCircle,
  approval_info_requested: Info,
  sign_request: PenTool,
  sign_completed: CheckCheck,
  workflow_completed: PartyPopper,
};

const notificationColors: Record<string, string> = {
  approval_request: 'text-blue-500',
  approval_approved: 'text-green-500',
  approval_rejected: 'text-red-500',
  approval_info_requested: 'text-yellow-500',
  sign_request: 'text-purple-500',
  sign_completed: 'text-green-500',
  workflow_completed: 'text-green-500',
};

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const router = useRouter();
  const Icon = notificationIcons[notification.type] || FileText;
  const iconColor = notificationColors[notification.type] || 'text-gray-500';

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link?.startsWith('/') && !notification.link.startsWith('//')) {
      router.push(notification.link);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${notification.is_read ? 'Đã đọc' : 'Chưa đọc'}: ${notification.title}`}
      className={`
        flex items-start gap-3 p-3 rounded-lg cursor-pointer
        transition-colors hover:bg-gray-50
        ${!notification.is_read ? 'bg-blue-50/50' : ''}
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
          )}
        </div>
        {notification.message && (
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { 
            addSuffix: true,
            locale: vi 
          })}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        aria-label="Xóa thông báo"
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
