'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const subscribeToHeaderSlot = () => () => undefined;
const getHeaderSlot = () => document.getElementById('dashboard-page-header');
const getServerHeaderSlot = () => null;

export function DashboardHeaderPortal({ icon: Icon, title, description, iconColor = 'text-blue-600', actions }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  iconColor?: string;
  actions?: React.ReactNode;
}) {
  const container = useSyncExternalStore(subscribeToHeaderSlot, getHeaderSlot, getServerHeaderSlot);

  if (!container) return null;

  return <>
    {createPortal(
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 sm:flex', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">{title}</h1>
            {description && <p className="hidden truncate text-xs text-slate-500 lg:block">{description}</p>}
          </div>
        </div>
        {actions && <div className="hidden shrink-0 md:flex md:items-center">{actions}</div>}
      </div>
      , container)}
    {actions && <div className="flex justify-end md:hidden">{actions}</div>}
  </>;
}
