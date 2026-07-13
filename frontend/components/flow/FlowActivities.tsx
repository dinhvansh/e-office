'use client';

import { Clock } from 'lucide-react';

interface Activity {
  timestamp: string;
  actor: string;
  action: string;
  details?: string;
}

interface FlowActivitiesProps {
  activities: Activity[];
}

export function FlowActivities({ activities }: FlowActivitiesProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Chưa có hoạt động nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      {activities.map((activity, index) => (
        <div key={index} className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-l-0">
          {/* Timeline Dot */}
          <div className="absolute left-0 top-0 -translate-x-[9px] w-4 h-4 rounded-full bg-blue-600 border-2 border-white" />

          {/* Activity Content */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {activity.actor}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {activity.action}
                </p>
                {activity.details && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    &quot;{activity.details}&quot;
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatTime(activity.timestamp)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
