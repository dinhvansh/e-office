'use client';

import * as React from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function parseDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-describedby'?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = 'Chọn ngày',
  disabled = false,
  className,
  id,
  'aria-describedby': ariaDescribedBy,
}: DatePickerProps) {
  const selectedDate = parseDate(value);
  const minDate = parseDate(min);
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(() => selectedDate || new Date());
  const [view, setView] = React.useState<'days' | 'years'>('days');
  const [yearPageStart, setYearPageStart] = React.useState(() => Math.floor((selectedDate || new Date()).getFullYear() / 12) * 12);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  const selectDate = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return;
    onChange(toDateValue(date));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        const initialDate = selectedDate || minDate || new Date();
        setMonth(initialDate);
        setYearPageStart(Math.floor(initialDate.getFullYear() / 12) * 12);
        setView('days');
      }
      setOpen(nextOpen);
    }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          className={cn(
            'h-11 w-full justify-between rounded-lg bg-background px-3 text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            className,
          )}
        >
          <span>{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : placeholder}</span>
          <CalendarDays className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[19rem] rounded-xl p-3 shadow-lg" portalled={false}>
        <div className="mb-3 flex items-center justify-between">
          <Button type="button" size="icon" variant="ghost" aria-label={view === 'years' ? 'Các năm trước' : 'Tháng trước'} onClick={() => view === 'years' ? setYearPageStart((year) => year - 12) : setMonth((current) => subMonths(current, 1))}>
            <ChevronLeft />
          </Button>
          {view === 'years' ? (
            <p className="font-semibold">{yearPageStart} – {yearPageStart + 11}</p>
          ) : (
            <Button type="button" size="sm" variant="ghost" className="capitalize" onClick={() => setView('years')} aria-label="Chọn năm">
              {format(month, 'MMMM yyyy', { locale: vi })} <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </Button>
          )}
          <Button type="button" size="icon" variant="ghost" aria-label={view === 'years' ? 'Các năm sau' : 'Tháng sau'} onClick={() => view === 'years' ? setYearPageStart((year) => year + 12) : setMonth((current) => addMonths(current, 1))}>
            <ChevronRight />
          </Button>
        </div>
        {view === 'years' ? (
          <div className="grid grid-cols-3 gap-2 py-1">
            {Array.from({ length: 12 }, (_, index) => yearPageStart + index).map((year) => {
              const isCurrentYear = month.getFullYear() === year;
              const isSelectedYear = selectedDate?.getFullYear() === year;
              return <Button key={year} type="button" size="sm" variant="ghost" onClick={() => { setMonth((current) => new Date(year, current.getMonth(), 1)); setView('days'); }} className={cn('h-10', (isCurrentYear || isSelectedYear) && 'bg-primary text-primary-foreground hover:bg-primary')}>
                {year}
              </Button>;
            })}
          </div>
        ) : <><div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEK_DAYS.map((day) => <span key={day} className="py-1">{day}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((date) => {
            const unavailable = !!minDate && isBefore(date, minDate);
            const chosen = !!selectedDate && isSameDay(date, selectedDate);
            const today = isSameDay(date, new Date());
            return (
              <button
                key={date.toISOString()}
                type="button"
                disabled={unavailable}
                onClick={() => selectDate(date)}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg text-sm transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30',
                  !isSameMonth(date, month) && 'text-muted-foreground/50',
                  today && !chosen && 'font-semibold text-primary',
                  chosen && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                )}
              >
                {format(date, 'd')}
              </button>
            );
          })}
        </div></>}
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <Button type="button" size="sm" variant="ghost" onClick={() => { onChange(''); setOpen(false); }} disabled={!selectedDate}>
            <X /> Xóa
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => selectDate(new Date())}>
            Hôm nay
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
