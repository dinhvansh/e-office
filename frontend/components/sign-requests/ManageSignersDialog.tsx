'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Users, Plus, Mail, User as UserIcon, GripVertical } from 'lucide-react';
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
  allowReorder?: boolean; // ✅ Only allow reorder if document type allows
}

export function ManageSignersDialog({
  signRequestId,
  signers,
  isOpen,
  onClose,
  onUpdate,
  fetchJson,
  allowReorder = false,
}: ManageSignersDialogProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>('signer'); // ✅ Default: Người ký
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localSigners, setLocalSigners] = useState<Signer[]>(signers);

  // ✅ Update local signers when prop changes
  React.useEffect(() => {
    setLocalSigners(signers);
  }, [signers]);

  // Add signer mutation
  const addSignerMutation = useMutation({
    mutationFn: async (signer: { email: string; name: string; role: string }) => {
      return fetchJson(`/sign-requests/${signRequestId}/signers`, {
        method: 'POST',
        body: JSON.stringify(signer),
      });
    },
    onSuccess: () => {
      toast.success('✅ Đã thêm người ký');
      setNewEmail('');
      setNewName('');
      setNewRole('signer');
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

  // ✅ Reorder signers mutation
  const reorderSignersMutation = useMutation({
    mutationFn: async (reorderedSigners: Signer[]) => {
      // Update signing_order for all signers
      const updates = reorderedSigners.map((signer, index) => ({
        id: signer.id,
        signing_order: index + 1,
      }));

      // Call backend API to update all signers
      return fetchJson(`/sign-requests/${signRequestId}/signers/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ signers: updates }),
      });
    },
    onSuccess: () => {
      toast.success('✅ Đã cập nhật thứ tự ký');
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể cập nhật thứ tự');
      // Revert to original order
      setLocalSigners(signers);
    },
  });

  // ✅ Update signer role mutation
  const updateSignerMutation = useMutation({
    mutationFn: async ({ signerId, role }: { signerId: number; role: string }) => {
      return fetchJson(`/sign-requests/${signRequestId}/signers/${signerId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      toast.success('✅ Đã cập nhật vai trò');
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể cập nhật vai trò');
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

    addSignerMutation.mutate({ email: newEmail, name: newName, role: newRole });
  };

  // ✅ Drag & Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSigners = [...localSigners];
    const draggedItem = newSigners[draggedIndex];
    newSigners.splice(draggedIndex, 1);
    newSigners.splice(index, 0, draggedItem);

    setLocalSigners(newSigners);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      // Save new order to backend
      reorderSignersMutation.mutate(localSigners);
    }
    setDraggedIndex(null);
  };

  const handleRoleChange = (signerId: number, newRole: string) => {
    updateSignerMutation.mutate({ signerId, role: newRole });
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
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-gray-700">
              Danh sách người ký ({localSigners.length})
            </h4>
            {allowReorder && localSigners.length > 1 && (
              <span className="text-xs text-gray-500">
                🔄 Kéo thả để sắp xếp lại
              </span>
            )}
          </div>
          
          {localSigners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có người ký nào
            </div>
          ) : (
            <div className="space-y-2">
              {localSigners.map((signer, index) => (
                <div
                  key={signer.id}
                  draggable={allowReorder}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                    allowReorder ? 'cursor-move hover:bg-blue-50 hover:border-blue-300' : 'hover:bg-gray-50'
                  } ${draggedIndex === index ? 'opacity-50 scale-95' : ''}`}
                >
                  {/* Drag Handle */}
                  {allowReorder && (
                    <div className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                      <GripVertical className="w-5 h-5" />
                    </div>
                  )}

                  {/* Order Badge */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>

                  {/* Signer Info */}
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
                    
                    {/* Role Selector */}
                    <div className="mt-2">
                      <select
                        value={signer.role || 'signer'}
                        onChange={(e) => handleRoleChange(signer.id, e.target.value)}
                        disabled={updateSignerMutation.isPending}
                        className="text-xs border rounded px-2 py-1 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="signer">👤 Người ký</option>
                        <option value="approver">✅ Người phê duyệt</option>
                      </select>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSigner(signer.id)}
                    disabled={localSigners.length === 1 || removeSignerMutation.isPending}
                    className="flex-shrink-0"
                    title={localSigners.length === 1 ? 'Phải có ít nhất 1 người ký' : 'Xóa người ký'}
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

          <div className="grid grid-cols-3 gap-3">
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

            <div>
              <Label htmlFor="new-role" className="text-xs">Vai trò *</Label>
              <select
                id="new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full h-10 border rounded-md px-3 text-sm bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="signer">👤 Người ký</option>
                <option value="approver">✅ Người phê duyệt</option>
              </select>
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
