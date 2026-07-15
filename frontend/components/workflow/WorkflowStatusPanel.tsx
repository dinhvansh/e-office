'use client';

import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type WorkflowStatusSummary = {
  status: string;
  current_actor: 'requester' | 'approver' | 'signer' | 'system' | null;
  next_action: string;
  progress: { completed: number; total: number };
  deadline: string | null;
  can_retry_artifact: boolean;
};

const statusCopy: Record<string, { label: string; next: string }> = {
  draft: { label: 'Bản nháp', next: 'Hoàn thiện và gửi yêu cầu ký.' },
  pending_approval: { label: 'Chờ phê duyệt', next: 'Chờ người phê duyệt được phân công xử lý.' },
  pending: { label: 'Chờ ký', next: 'Chờ người ký được phân công xử lý.' },
  pending_signature: { label: 'Chờ ký', next: 'Chờ người ký được phân công xử lý.' },
  in_progress: { label: 'Đang ký', next: 'Chờ các bước ký còn lại hoàn tất.' },
  generating_artifact: { label: 'Đang tạo bản hoàn tất', next: 'Hệ thống đang tạo PDF đã ký. Bạn có thể quay lại sau.' },
  artifact_failed: { label: 'Chưa tạo được bản hoàn tất', next: 'PDF đã ký chưa được tạo. Hãy thử lại nếu bạn có quyền quản lý yêu cầu.' },
  completed: { label: 'Hoàn thành', next: 'Tài liệu đã hoàn tất và sẵn sàng để xem.' },
  cancelled: { label: 'Đã hủy', next: 'Yêu cầu đã kết thúc. Xem lại lịch sử nếu cần.' },
  rejected: { label: 'Bị từ chối', next: 'Xem lý do từ chối và cập nhật yêu cầu nếu phù hợp.' },
  expired: { label: 'Đã hết hạn', next: 'Yêu cầu đã hết hạn. Tạo hoặc gửi lại yêu cầu mới.' },
};

const actorCopy: Record<NonNullable<WorkflowStatusSummary['current_actor']>, string> = {
  requester: 'Người tạo yêu cầu',
  approver: 'Người phê duyệt được phân công',
  signer: 'Người ký được phân công',
  system: 'Hệ thống',
};

export function WorkflowStatusPanel({ summary, onRetryArtifact, retrying = false }: {
  summary?: WorkflowStatusSummary | null;
  onRetryArtifact?: () => void;
  retrying?: boolean;
}) {
  const safe = summary || { status: 'draft', current_actor: 'requester' as const, next_action: 'EDIT_AND_SEND', progress: { completed: 0, total: 0 }, deadline: null, can_retry_artifact: false };
  const copy = statusCopy[safe.status] || { label: 'Đang cập nhật trạng thái', next: 'Trạng thái đang được cập nhật. Vui lòng tải lại sau.' };
  const isFailure = safe.status === 'artifact_failed';
  return (
    <section className="rounded-lg border bg-card p-4 space-y-4" aria-labelledby="workflow-status-heading" aria-live="polite">
      <div className="flex gap-3">
        {isFailure ? <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" /> : safe.status === 'completed' ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" aria-hidden="true" /> : <Clock3 className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />}
        <div>
          <h2 id="workflow-status-heading" className="font-semibold">Tiến độ xử lý: {copy.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.next}</p>
        </div>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div><p className="text-muted-foreground">Đang xử lý</p><p className="flex items-center gap-1 font-medium"><UserRound className="h-4 w-4" aria-hidden="true" />{safe.current_actor ? actorCopy[safe.current_actor] : 'Không có bước đang chờ'}</p></div>
        <div><p className="text-muted-foreground">Tiến độ</p><p className="font-medium">{safe.progress.completed}/{safe.progress.total} người đã ký</p></div>
        <div><p className="text-muted-foreground">Hạn xử lý</p><p className="font-medium">{safe.deadline ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(safe.deadline)) : 'Chưa đặt hạn'}</p></div>
      </div>
      {isFailure && safe.can_retry_artifact && onRetryArtifact ? <Button type="button" variant="outline" onClick={onRetryArtifact} disabled={retrying}><RefreshCw className={retrying ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />{retrying ? 'Đang thử lại' : 'Thử tạo lại PDF'}</Button> : null}
    </section>
  );
}
