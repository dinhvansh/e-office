'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Edit, Trash2, Settings, FileType } from 'lucide-react';
import { DocumentType } from '@/lib/types';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';

export default function DocumentTypesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [showNumberingPattern, setShowNumberingPattern] = useState(true);
  const queryClient = useQueryClient();
  const { fetchJson } = useAuth();

  const { data: typesData, isLoading } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => fetchJson<DocumentType[]>('/document-types'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DocumentType>) =>
      fetchJson('/document-types', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(editingType ? 'Cập nhật loại văn bản thành công!' : 'Tạo loại văn bản thành công!');
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      setShowCreateModal(false);
      setEditingType(null);
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<DocumentType> & { id: number }) =>
      fetchJson(`/document-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Cập nhật loại văn bản thành công!');
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      setShowCreateModal(false);
      setEditingType(null);
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (typeId: number) =>
      fetchJson(`/document-types/${typeId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Xóa loại văn bản thành công!');
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const types: DocumentType[] = typesData || [];

  // Ensure _count exists for compatibility
  const typesWithCount = types.map(type => ({
    ...type,
    _count: type._count || { documents: 0 },
    numbering_rules: type.numbering_rules || [],
  }));

  const categoryColors: Record<string, string> = {
    incoming: 'bg-blue-100 text-blue-700',
    outgoing: 'bg-green-100 text-green-700',
    internal: 'bg-purple-100 text-purple-700',
    contract: 'bg-orange-100 text-orange-700',
  };

  const categoryLabels: Record<string, string> = {
    incoming: 'Văn bản đến',
    outgoing: 'Văn bản đi',
    internal: 'Nội bộ',
    contract: 'Hợp đồng',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileType}
        title="Loại văn bản"
        description="Quản lý phân loại và đánh số văn bản"
        iconColor="text-orange-600"
        actions={
          <Button onClick={() => { setEditingType(null); setShowCreateModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm loại văn bản
          </Button>
        }
      />

      {/* Document Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </>
        ) : types.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={FileType}
              title="Chưa có loại văn bản"
              description="Tạo loại văn bản đầu tiên để phân loại và quản lý tài liệu"
              action={{
                label: "Thêm loại văn bản",
                onClick: () => { setEditingType(null); setShowCreateModal(true); }
              }}
            />
          </div>
        ) : (
          typesWithCount.map((type) => (
            <div
              key={type.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{type.name}</h3>
                    <p className="text-sm text-gray-500">{type.code}</p>
                  </div>
                </div>
                {!type.is_active && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    Inactive
                  </span>
                )}
              </div>

              {type.description && (
                <p className="text-sm text-gray-600 mb-4">{type.description}</p>
              )}

              <div className="space-y-2 mb-4">
                {type.category && (
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      categoryColors[type.category] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {categoryLabels[type.category] || type.category}
                  </span>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  {type.require_numbering && (
                    <span className="flex items-center gap-1">
                      <Settings className="w-3 h-3" />
                      Đánh số tự động
                    </span>
                  )}
                  {type.require_digital_signing && (
                    <span className="flex items-center gap-1">
                      ✍️ Ký số
                    </span>
                  )}
                </div>

                {type.numbering_rules[0] && (
                  <div className="text-xs text-gray-500 mt-2">
                    <span className="font-medium">Pattern:</span>{' '}
                    {type.numbering_rules[0].pattern}
                    <br />
                    <span className="font-medium">Số cuối:</span>{' '}
                    {type.numbering_rules[0].last_number}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {type._count.documents} văn bản
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingType(type);
                      setShowNumberingPattern(type.require_numbering);
                      setShowCreateModal(true);
                    }}
                    title="Chỉnh sửa"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (type._count.documents > 0) {
                        toast.error('Không thể xóa loại văn bản đang được sử dụng');
                        return;
                      }
                      if (confirm(`Xóa loại văn bản "${type.name}"?`)) {
                        deleteTypeMutation.mutate(type.id);
                      }
                    }}
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) setEditingType(null);
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Chỉnh sửa loại văn bản' : 'Thêm loại văn bản mới'}
            </DialogTitle>
            <DialogDescription>
              {editingType ? 'Cập nhật thông tin loại văn bản' : 'Tạo loại văn bản để phân loại và quản lý tài liệu'}
            </DialogDescription>
          </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const requireNumbering = formData.get('require_numbering') === 'on';
                  const data = {
                    code: formData.get('code') as string,
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    category: formData.get('category') as string,
                    require_numbering: requireNumbering,
                    require_digital_signing: formData.get('require_digital_signing') === 'on',
                    numbering_pattern: requireNumbering ? (formData.get('numbering_pattern') as string) : null,
                  };
                  if (editingType) {
                    updateMutation.mutate({ id: editingType.id, ...data });
                  } else {
                    createMutation.mutate(data);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã *</label>
                  <input
                    name="code"
                    required
                    defaultValue={editingType?.code}
                    placeholder="VD: CV, HD, QD"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên *</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingType?.name}
                    placeholder="VD: Công văn, Hợp đồng"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingType?.description || ''}
                    placeholder="Mô tả chi tiết về loại văn bản..."
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Danh mục</label>
                  <select
                    name="category"
                    defaultValue={editingType?.category || ''}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                  >
                    <option value="" className="text-gray-400">Chọn danh mục</option>
                    <option value="incoming" className="text-gray-900">� VVăn bản đến</option>
                    <option value="outgoing" className="text-gray-900">📤 Văn bản đi</option>
                    <option value="internal" className="text-gray-900">🏢 Nội bộ</option>
                    <option value="contract" className="text-gray-900">📄 Hợp đồng</option>
                  </select>
                </div>
                <div className="space-y-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-5 border border-gray-200">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="require_numbering"
                      defaultChecked={editingType?.require_numbering ?? true}
                      onChange={(e) => setShowNumberingPattern(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                    />
                    <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                      🔢 Yêu cầu đánh số tự động
                    </span>
                  </label>

                  {showNumberingPattern && (
                    <div className="ml-7 space-y-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Cấu hình đánh số
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.querySelector('[name="numbering_pattern"]') as HTMLInputElement;
                            if (input) input.value = (input.value || '') + '{AUTO}';
                          }}
                          className="px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          + Số tự động
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.querySelector('[name="numbering_pattern"]') as HTMLInputElement;
                            if (input) input.value = (input.value || '') + '{YEAR}';
                          }}
                          className="px-3 py-2 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          + Năm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.querySelector('[name="numbering_pattern"]') as HTMLInputElement;
                            if (input) input.value = (input.value || '') + '{MONTH}';
                          }}
                          className="px-3 py-2 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          + Tháng
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.querySelector('[name="numbering_pattern"]') as HTMLInputElement;
                            if (input) input.value = (input.value || '') + '{TYPE}';
                          }}
                          className="px-3 py-2 text-xs font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          + Mã loại
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.querySelector('[name="numbering_pattern"]') as HTMLInputElement;
                            if (input) input.value = (input.value || '') + '/';
                          }}
                          className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          + Dấu /
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.querySelector('[name="numbering_pattern"]') as HTMLInputElement;
                            if (input) input.value = (input.value || '') + '-';
                          }}
                          className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          + Dấu -
                        </button>
                      </div>
                      <input
                        type="text"
                        name="numbering_pattern"
                        defaultValue="{AUTO}/{YEAR}"
                        placeholder="VD: {AUTO}/{YEAR} hoặc {TYPE}-{AUTO}/{MONTH}/{YEAR}"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      />
                      <div className="text-xs text-gray-500 space-y-1">
                        <p className="font-medium">Ví dụ kết quả:</p>
                        <p className="font-mono bg-gray-50 px-2 py-1 rounded">001/2025 hoặc CV-001/11/2025</p>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="require_digital_signing"
                      defaultChecked={editingType?.require_digital_signing ?? false}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                    />
                    <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                      ✍️ Yêu cầu ký số điện tử
                    </span>
                  </label>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingType(null);
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingType
                      ? updateMutation.isPending
                        ? 'Đang cập nhật...'
                        : 'Cập nhật'
                      : createMutation.isPending
                      ? 'Đang tạo...'
                      : 'Tạo mới'}
                  </Button>
                </DialogFooter>
              </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
