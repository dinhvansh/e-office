'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit, Trash2, Phone, Mail, User } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

type ExternalOrg = {
  id: number;
  name: string;
  code: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  is_active: boolean;
  created_at: string;
};

const CATEGORIES = [
  { value: 'government', label: 'Cơ quan nhà nước', color: 'bg-blue-100 text-blue-700' },
  { value: 'supplier', label: 'Nhà cung cấp', color: 'bg-green-100 text-green-700' },
  { value: 'customer', label: 'Khách hàng', color: 'bg-purple-100 text-purple-700' },
  { value: 'partner', label: 'Đối tác', color: 'bg-orange-100 text-orange-700' },
];

export default function ExternalOrgsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ExternalOrg | null>(null);
  const queryClient = useQueryClient();
  const { fetchJson } = useAuth();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['external-orgs'],
    queryFn: () => fetchJson<ExternalOrg[]>('/external-orgs'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ExternalOrg>) => {
      console.log('Creating external org:', data);
      return fetchJson('/external-orgs', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: async () => {
      console.log('External org created successfully');
      setShowModal(false);
      toast.success('Tạo tổ chức thành công!');
      // Small delay to ensure backend has saved
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['external-orgs'] });
        console.log('Refetched external orgs');
      }, 300);
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<ExternalOrg> & { id: number }) =>
      fetchJson(`/external-orgs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-orgs'] });
      setShowModal(false);
      setEditingOrg(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/external-orgs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-orgs'] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      category: formData.get('category') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      contact_person: formData.get('contact_person') as string,
    };

    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCategoryLabel = (category: string | null) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>
        {cat.label}
      </span>
    ) : (
      <span className="text-gray-400">-</span>
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tổ chức bên ngoài</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý danh sách tổ chức, đối tác, nhà cung cấp</p>
        </div>
        <button
          onClick={() => {
            setEditingOrg(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Thêm tổ chức
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const count = orgs.filter((o) => o.category === cat.value).length;
          return (
            <div key={cat.value} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{cat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{count}</p>
                </div>
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Tổ chức
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Loại
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Liên hệ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{org.name}</div>
                    <div className="text-sm text-gray-500">{org.code || '-'}</div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">{getCategoryLabel(org.category)}</td>
                <td className="px-6 py-4">
                  <div className="space-y-1 text-sm">
                    {org.contact_person && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-3.5 w-3.5" />
                        {org.contact_person}
                      </div>
                    )}
                    {org.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-3.5 w-3.5" />
                        {org.phone}
                      </div>
                    )}
                    {org.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-3.5 w-3.5" />
                        {org.email}
                      </div>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingOrg(org);
                      setShowModal(true);
                    }}
                    className="mr-3 text-blue-600 hover:text-blue-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Xóa tổ chức này?')) {
                        deleteMutation.mutate(org.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                {editingOrg ? 'Sửa tổ chức' : 'Thêm tổ chức mới'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên tổ chức *</label>
                  <input
                    name="name"
                    defaultValue={editingOrg?.name}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mã</label>
                  <input
                    name="code"
                    defaultValue={editingOrg?.code || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Loại</label>
                  <select
                    name="category"
                    defaultValue={editingOrg?.category || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">-- Chọn loại --</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                  <input
                    name="address"
                    defaultValue={editingOrg?.address || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                  <input
                    name="phone"
                    defaultValue={editingOrg?.phone || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingOrg?.email || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Người liên hệ</label>
                  <input
                    name="contact_person"
                    defaultValue={editingOrg?.contact_person || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingOrg(null);
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {editingOrg ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
