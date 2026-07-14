'use client';

import { isApiConfigurationAvailable } from '@/lib/env';

export function ApiConfigurationGuard({ children }: { children: React.ReactNode }) {
  if (isApiConfigurationAvailable()) return <>{children}</>;

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><section className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm" role="alert" aria-live="assertive"><h1 className="text-xl font-semibold text-slate-900">Dịch vụ tạm thời chưa sẵn sàng</h1><p className="mt-3 text-sm text-slate-600">Vui lòng thử lại sau hoặc liên hệ bộ phận quản trị hệ thống.</p></section></main>;
}
