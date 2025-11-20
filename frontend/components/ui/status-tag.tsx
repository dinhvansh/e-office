import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'pending' | 'warning' | 'danger' | 'info' | 'default';

interface StatusTagProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  default: 'bg-gray-100 text-gray-700 border-gray-200',
};

// Auto-detect variant from status text
const getVariantFromStatus = (status: string): StatusVariant => {
  const lower = status.toLowerCase();
  
  if (lower.includes('hoàn') || lower.includes('thành công') || lower.includes('active') || lower.includes('approved')) {
    return 'success';
  }
  if (lower.includes('chờ') || lower.includes('pending') || lower.includes('waiting')) {
    return 'pending';
  }
  if (lower.includes('cảnh báo') || lower.includes('warning')) {
    return 'warning';
  }
  if (lower.includes('từ chối') || lower.includes('hủy') || lower.includes('rejected') || lower.includes('cancelled') || lower.includes('inactive')) {
    return 'danger';
  }
  if (lower.includes('info') || lower.includes('thông tin')) {
    return 'info';
  }
  
  return 'default';
};

export function StatusTag({ status, variant, className }: StatusTagProps) {
  const finalVariant = variant || getVariantFromStatus(status);
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[finalVariant],
        className
      )}
    >
      {status}
    </span>
  );
}
