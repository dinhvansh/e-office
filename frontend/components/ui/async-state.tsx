import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from './button';
import { Skeleton } from './skeleton';

export function AsyncStatus({ message }: { message: string }) {
  return <p className="sr-only" role="status" aria-live="polite">{message}</p>;
}

export function AsyncListSkeleton({ rows = 3, label = 'Đang tải dữ liệu...' }: { rows?: number; label?: string }) {
  return <div className="space-y-3 p-4" aria-busy="true"><AsyncStatus message={label} />{Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>;
}

export function AsyncEmptyState({ title, description }: { title: string; description: string }) {
  return <div className="p-8 text-center" role="status"><Inbox className="mx-auto mb-3 h-10 w-10 text-slate-400" aria-hidden="true" /><h3 className="font-medium text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

export function AsyncErrorState({ message, onRetry, retryLabel = 'Thử lại' }: { message: string; onRetry: () => void; retryLabel?: string }) {
  return <div className="p-6 text-center" role="alert" aria-live="assertive" tabIndex={-1}><AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-600" aria-hidden="true" /><p className="text-sm text-slate-700">{message}</p><Button className="mt-4" variant="outline" onClick={onRetry}>{retryLabel}</Button></div>;
}

export function InlineActionFeedback({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return <p className={error ? 'text-sm text-red-700' : 'text-sm text-green-700'} role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}>{error || success}</p>;
}
