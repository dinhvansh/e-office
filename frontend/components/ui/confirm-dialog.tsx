import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  icon?: 'trash' | 'warning';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger',
  icon = 'trash',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="items-center text-center space-y-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
            }`}
          >
            {icon === 'trash' ? (
              <Trash2 className={`w-8 h-8 ${variant === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
            ) : (
              <AlertTriangle className={`w-8 h-8 ${variant === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
            )}
          </div>
          <div className="space-y-2 text-center">
            <DialogTitle className="text-xl font-semibold text-center">{title}</DialogTitle>
            <DialogDescription className="text-base text-gray-600 text-center">{description}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="flex-row justify-center gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-[140px]">
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={`min-w-[140px] ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
