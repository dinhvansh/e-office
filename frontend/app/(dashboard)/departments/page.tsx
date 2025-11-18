'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:parameter>
<parameter name="text">'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Users, Edit, Trash2, ChevronRight } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  description?: string;
  parent?: { id: number; name: string };
  manager?: { id: number; email: string; full_name?: string };
  _count: { users: number; children: number };
  children?: Department[];
}

export default function DepartmentsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: deptData, isLoading } = useQuery({
    queryKey: ['departments-tree'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/departments/tree`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch departments');
      return res.json();
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (deptId: number) => {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/departments/${deptId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete department');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments-tree'] });
    },
  });

  const departments: Department[] = deptData?.data || [];

  const renderDepartment = (dept: Department, level = 0) => (
    <div key={dept.id} className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: `${level * 2 + 1}rem` }}
      >
        <div className="flex items-center gap-3 flex-1">
          {level > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          <Building2 className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <div className="font-medium text-gray-900">{dept.name}</div>
            {dept.description && (
              <div className="text-sm text-gray-500">{dept.description}</div>
            )}
            {dept.manager && (
              <div className="text-sm text-gray-600 mt-1">
                Quản lý: {dept.manager.full_name || dept.manager.email}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{dept._count.users} người</span>
          </div>
          {dept._count.children > 0 && (
            <div className="text-sm text-gray-600">
              {dept._count.children} phòng ban con
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Chỉnh sửa"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (dept._count.users > 0) {
                  alert('Không thể xóa phòng ban có nhân viên');
                  return;
                }
                if (dept._count.children > 0) {
                  alert('Không thể xóa phòng ban có phòng ban con');
                  return;
                }
                if (confirm(`Bạn có chắc muốn xóa phòng ban "${dept.name}"?`)) {
                  deleteDeptMutation.mutate(dept.id);
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

      {dept.children && dept.children.length > 0 && (
        <div>
          {dept.children.map((child) => renderDepartment(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý phòng ban</h1>
          <p className="text-sm text-gray-600 mt-1">
            Tổ chức cấu trúc phòng ban và quản lý
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm phòng ban
        </button>
      </div>

      {/* Departments Tree */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : departments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có phòng ban nào
          </div>
        ) : (
          <div>{departments.map((dept) => renderDepartment(dept))}</div>
        )}
      </div>
    </div>
  );
}
