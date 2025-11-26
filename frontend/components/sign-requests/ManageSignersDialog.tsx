'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Users, Plus, Mail, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface Signer {
  id: number;
  email: string;
  name: string;
  role?: string;
  signing_order?: number;
  is_internal?: boolean;
}

interface ManageSignersDialogProps {
  signRequestId: number;
  signers: Signer[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  fetchJson: any; // Pass from parent
}

export function ManageSignersDialog({
  signRequestId,
  signers,
  isOpen,
  onClose,
  onUpdate,
  fetchJson,
}: ManageSignersDialogProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  // Add signer mutation
  const addSignerMutation = useMutation({
    mutationFn: async (signer: { email: string; name: string }) => {
      return fetchJson(`/sign-requests/${signRequestId}/signers`, {
        method: 'POST',
        body: JSON.stringify(signer),
      });
    },
    onSuccess: () => {
      toast.success('✅ Đã thêm người ký');
      setNewEmail('');
      setNewName('');
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể thêm người ký');
    },
  });

  // Remove signer mutation
  const removeSignerMutation = useMutation({
    mutationFn: async (signerId: number) => {
      return fetchJson(`/sign-requests/${signRequestId}/signers/${signerId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast.success('✅ Đã xóa người ký');
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể xóa người ký');
    },
  });

  const handleAddSigner = () => {
    if (!newEmail || !newName) {
      toast.error('Vui lòng nhập đầy đủ email và tên');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Email không hợp lệ');
      return;
    }

    addSignerMutation.mutate({ email: newEmail, name: newName });
  };

  const handleRemoveSigner = (signerId: number) => {
    if (signers.length <= 1) {
      toast.error('Phải có ít nhất 1 người ký');
      return;
    }

    if (confirm('Bạn có chắc muốn xóa người ký này?\n\nCác trường chữ ký đã gán cho người này sẽ bị xóa.')) {
      removeSignerMutation.mutate(signerId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Quản lý người ký
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">
            Danh sách người ký ({signers.length})
          </h4>
          
          {signers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có người ký nào
            </div>
          ) : (
            <div className="space-y-2">
              {signers.map((signer, index) => (
                <div
                  key={signer.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm truncate">
                        {signer.name}
                      </div>
                      {signer.is_internal && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          Nội bộ
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {signer.email}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSigner(signer.id)}
                    disabled={signers.length === 1 || removeSignerMutation.isPending}
                    className="flex-shrink-0"
                    title={signers.length === 1 ? 'Phải có ít nhất 1 người ký' : 'Xóa người ký'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Thêm người ký mới
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-email" className="text-xs">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="new-email"
                  type="email"
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSigner()}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="new-name" className="text-xs">Họ tên *</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="new-name"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSigner()}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddSigner}
            disabled={addSignerMutation.isPending || !newEmail || !newName}
            className="w-full"
          >
            {addSignerMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Đang thêm...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Thêm người ký
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500">
            💡 Người ký nội bộ sẽ được tự động phát hiện dựa trên email.
          </p>
        </div>

        <div className="border-t pt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
