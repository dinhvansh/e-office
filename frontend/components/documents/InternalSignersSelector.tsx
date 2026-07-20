'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, X, GripVertical } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';

export interface InternalSigner {
  user_id: number;
  name: string;
  email: string;
  signing_order: number;
  role: 'signer' | 'approver';
}

interface InternalSignersSelectorProps {
  signers: InternalSigner[];
  onChange: (signers: InternalSigner[]) => void;
  allowEdit?: boolean; // For Flexible mode
  signerOnly?: boolean;
}

export function InternalSignersSelector({ signers, onChange, allowEdit = false, signerOnly = false }: InternalSignersSelectorProps) {
  const { fetchJson } = useAuth();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // ✅ Fetch only active users
  const { data: users } = useQuery({
    queryKey: ['users', 'active'],
    queryFn: async () => {
      const data = await fetchJson<any>('/users/active');
      return Array.isArray(data) ? data : [];
    },
  });

  const handleAddSigner = () => {
    const newOrder = signers.length > 0 ? Math.max(...signers.map(s => s.signing_order)) + 1 : 1;
    onChange([
      ...signers,
      {
        user_id: 0,
        name: '',
        email: '',
        signing_order: newOrder,
        role: 'signer',
      },
    ]);
  };

  const handleRemoveSigner = (index: number) => {
    const newSigners = signers.filter((_, i) => i !== index);
    // Reorder
    const reordered = newSigners.map((s, i) => ({ ...s, signing_order: i + 1 }));
    onChange(reordered);
  };

  const handleUpdateSigner = (index: number, field: keyof InternalSigner, value: any) => {
    const newSigners = [...signers];
    
    if (field === 'user_id') {
      // Convert string to number for user_id
      const userId = parseInt(value);
      newSigners[index] = { 
        ...newSigners[index], 
        user_id: userId 
      };
      
      // Update name and email from selected user
      const user = users?.find((u: any) => u.id === userId);
      if (user) {
        newSigners[index].name = user.full_name || user.email;
        newSigners[index].email = user.email;
      }
    } else {
      // For other fields, just update directly
      newSigners[index] = { 
        ...newSigners[index], 
        [field]: value 
      };
    }
    
    onChange(newSigners);
  };

  // Drag & Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSigners = [...signers];
    const draggedItem = newSigners[draggedIndex];
    newSigners.splice(draggedIndex, 1);
    newSigners.splice(index, 0, draggedItem);

    // Update signing_order
    const reordered = newSigners.map((s, i) => ({ ...s, signing_order: i + 1 }));
    onChange(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (!allowEdit && signers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold text-blue-700">
            👤 Người ký nội bộ (Internal Signers)
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            {allowEdit 
              ? '🔄 Chế độ Flexible: Có thể thêm/sửa người ký nội bộ'
              : '🔒 Chế độ Strict: Chỉ load từ workflow (không thể sửa)'}
          </p>
        </div>
        {allowEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddSigner}
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Thêm người ký nội bộ
          </Button>
        )}
      </div>

      {signers.length === 0 && !allowEdit && (
        <div className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md border border-dashed">
          ℹ️ Không có người ký nội bộ trong workflow này
        </div>
      )}

      {signers.length > 0 && (
        <div className="space-y-2">
          {allowEdit && (
            <p className="text-xs text-muted-foreground">
              🔄 Kéo thả để sắp xếp lại thứ tự ký
            </p>
          )}
          
          {signers.map((signer, index) => (
            <div
              key={index}
              draggable={allowEdit}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 border rounded-lg bg-blue-50 border-blue-200 ${
                allowEdit ? 'cursor-move hover:bg-blue-100 hover:border-blue-300' : ''
              } ${draggedIndex === index ? 'opacity-50 scale-95' : ''} transition-all`}
            >
              {/* Drag Handle */}
              {allowEdit && (
                <GripVertical className="w-4 h-4 text-gray-400" />
              )}

              {/* Order Badge or Input - Only editable in Flexible mode */}
              {allowEdit ? (
                <div className="flex-shrink-0">
                  <input
                    type="number"
                    min="1"
                    value={signer.signing_order}
                    onChange={(e) => {
                      const newOrder = parseInt(e.target.value) || 1;
                      handleUpdateSigner(index, 'signing_order', newOrder);
                    }}
                    className="w-12 h-8 text-center border-2 border-blue-300 rounded-md font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    title="Thứ tự ký"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                  {signer.signing_order}
                </div>
              )}

              {/* User Selector or Display */}
              <div className="flex-1 space-y-2">
                {allowEdit ? (
                  <>
                    <SearchableSelect
                      options={users?.map((user: any) => ({
                        value: user.id,
                        label: `${user.full_name || user.email} (${user.email})`,
                      })) || []}
                      value={signer.user_id && signer.user_id > 0 ? signer.user_id : ''}
                      onChange={(value) => handleUpdateSigner(index, 'user_id', typeof value === 'string' ? value : value.toString())}
                      placeholder="-- Chọn người ký --"
                    />

                    {!signerOnly && <Select
                      value={signer.role}
                      onValueChange={(value) => handleUpdateSigner(index, 'role', value as 'signer' | 'approver')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="signer">✍️ Người ký</SelectItem>
                        <SelectItem value="approver">✅ Người phê duyệt</SelectItem>
                      </SelectContent>
                    </Select>}
                  </>
                ) : (
                  <>
                    <div className="font-medium text-blue-900">{signer.name}</div>
                    <div className="text-sm text-blue-600">{signer.email}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        signer.role === 'signer' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {signer.role === 'signer' ? '✍️ Người ký' : '✅ Người phê duyệt'}
                      </span>
                      <span className="text-xs text-blue-600">Nội bộ</span>
                    </div>
                  </>
                )}
              </div>

              {/* Remove Button */}
              {allowEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveSigner(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {allowEdit && signers.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50">
          <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm text-blue-600 mb-2">Chưa có người ký nội bộ</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddSigner}
            className="border-blue-300 text-blue-600 hover:bg-blue-100"
          >
            <Plus className="w-4 h-4 mr-1" />
            Thêm người ký nội bộ đầu tiên
          </Button>
        </div>
      )}
    </div>
  );
}
