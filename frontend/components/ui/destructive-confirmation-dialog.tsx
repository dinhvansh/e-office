"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DestructiveConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  targetName: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
  errorMessage?: string;
  destructive?: boolean;
};

export function DestructiveConfirmationDialog({
  open,
  onOpenChange,
  title,
  targetName,
  description,
  confirmLabel,
  onConfirm,
  errorMessage = "Không thể hoàn tất thao tác này. Vui lòng thử lại.",
  destructive = true,
}: DestructiveConfirmationDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setError(null);
      onOpenChange(true);
      return;
    }
    close();
  };

  const close = () => {
    if (isPending) return;
    onOpenChange(false);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  };

  const handleConfirm = async () => {
    if (isPending) return;
    setIsPending(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
      window.setTimeout(() => returnFocusRef.current?.focus(), 0);
    } catch (error) {
      setError(error instanceof Error && error.message ? error.message : errorMessage);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby="destructive-confirmation-description" className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="destructive-confirmation-description">
            {description}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 break-words">
          {targetName}
        </p>
        {error && (
          <p role="alert" aria-live="assertive" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={isPending}>
            Hủy
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isPending ? "Đang xử lý..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
