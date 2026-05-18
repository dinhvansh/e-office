'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel'
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[3px]">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message */}
        <div className="mb-7">
          <p className="whitespace-pre-line text-base leading-7 text-slate-600">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-200 pt-5">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="h-12 flex-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className="h-12 flex-1 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
