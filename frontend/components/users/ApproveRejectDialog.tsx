'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle } from 'lucide-react';

interface ApproveRejectDialogProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: number;
    email: string;
    full_name?: string;
  } | null;
  action: 'approve' | 'reject';
  onConfirm: (userId: number, reason?: string) => Promise<void>;
}

export function ApproveRejectDialog({ open, onClose, user, action, onConfirm }: ApproveRejectDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!user) return;

    if (action === 'reject' && !reason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(user.id, reason);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'approve' ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                Phê duyệt người dùng
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                Từ chối người dùng
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve' 
              ? `Bạn có chắc chắn muốn phê duyệt tài khoản của ${user.full_name || user.email}?`
              : `Bạn có chắc chắn muốn từ chối tài khoản của ${user.full_name || user.email}?`
            }
          </DialogDescription>
        </DialogHeader>

        {action === 'approve' ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Sau khi phê duyệt:</strong>
            </p>
            <ul className="text-sm text-green-700 mt-2 space-y-1 list-disc list-inside">
              <li>Tài khoản sẽ được kích hoạt</li>
              <li>Người dùng có thể đăng nhập vào hệ thống</li>
              <li>Email thông báo sẽ được gửi tự động</li>
                <li>Vai trò mặc định &quot;User&quot; sẽ được gán</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Sau khi từ chối:</strong>
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                <li>Tài khoản sẽ bị đánh dấu là &quot;rejected&quot;</li>
                <li>Người dùng không thể đăng nhập</li>
                <li>Email thông báo lý do từ chối sẽ được gửi</li>
                <li>Có thể đăng ký lại sau 24 giờ</li>
              </ul>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do từ chối đăng ký (sẽ được gửi qua email cho người dùng)"
                rows={4}
                required
                disabled={loading}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {loading ? 'Đang xử lý...' : action === 'approve' ? 'Phê duyệt' : 'Từ chối'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
