'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Edit, Trash2, Settings } from 'lucide-react';

interface DocumentType {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  require_numbering: boolean;
  require_digital_signing: boolean;
  is_active: boolean;
  _count: { documents: number };
  numbering_rules: Array<{
    id: number;
    pattern: string;
    last_number: number;
  }>;
}

export default function DocumentTypesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: typesData, isLoading } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/document-types`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch document types');
      return res.json();
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (typeId: number) => {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/document-types/${typeId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
    },
  });

  const types: DocumentType[] = typesData?.data || [];

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loại văn bản</h1>
          <p className="text-sm text-gray-600 mt-1">
            Quản lý phân loại và đánh số văn bản
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm loại văn bản
        </button>
      </div>

      {/* Document Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-gray-500">
            Đang tải...
          </div>
        ) : types.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500">
            Chưa có loại văn bản nào
          </div>
        ) : (
          types.map((type) => (
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
                  <button
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (type._count.documents > 0) {
                        alert('Không thể xóa loại văn bản đang được sử dụng');
                        return;
                      }
                      if (confirm(`Xóa loại văn bản "${type.name}"?`)) {
                        deleteTypeMutation.mutate(type.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
