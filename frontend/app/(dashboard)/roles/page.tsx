'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Users, Edit, Trash2, Lock } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  description?: string;
  is_system: boolean;
  role_permissions: Array<{
    permission: {
      id: number;
      resource: string;
      action: string;
      description?: string;
    };
  }>;
  _count: { user_roles: number };
}

export default function RolesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const queryClient = useQueryClient();

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/roles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch roles');
      return res.json();
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/roles/${roleId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete role');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const roles: Role[] = rolesData?.data || [];

  // Group permissions by resource
  const groupPermissions = (role: Role) => {
    const grouped: Record<string, string[]> = {};
    role.role_permissions.forEach((rp) => {
      const resource = rp.permission.resource;
      if (!grouped[resource]) grouped[resource] = [];
      grouped[resource].push(rp.permission.action);
    });
    return grouped;
  };

  const resourceLabels: Record<string, string> = {
    users: 'Người dùng',
    departments: 'Phòng ban',
    documents: 'Tài liệu',
    sign_requests: 'Yêu cầu ký',
    roles: 'Vai trò',
    audit_logs: 'Nhật ký',
    settings: 'Cài đặt',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý vai trò</h1>
          <p className="text-sm text-gray-600 mt-1">
            Phân quyền và quản lý vai trò người dùng
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo vai trò mới
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-gray-500">
            Đang tải...
          </div>
        ) : roles.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500">
            Chưa có vai trò nào
          </div>
        ) : (
          roles.map((role) => {
            const permissions = groupPermissions(role);
            return (
              <div
                key={role.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {role.name}
                        {role.is_system && (
                          <Lock className="w-4 h-4 text-gray-400" title="Vai trò hệ thống" />
                        )}
                      </h3>
                      {role.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{role._count.user_roles} người dùng</span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Quyền:</div>
                    <div className="space-y-1">
                      {Object.entries(permissions).map(([resource, actions]) => (
                        <div key={resource} className="text-sm text-gray-600">
                          <span className="font-medium">
                            {resourceLabels[resource] || resource}:
                          </span>{' '}
                          {actions.join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedRole(role)}
                    className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Xem chi tiết
                  </button>
                  {!role.is_system && (
                    <>
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (role._count.user_roles > 0) {
                            alert('Không thể xóa vai trò đang được sử dụng');
                            return;
                          }
                          if (confirm(`Bạn có chắc muốn xóa vai trò "${role.name}"?`)) {
                            deleteRoleMutation.mutate(role.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Role Detail Modal */}
      {selectedRole && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRole(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                {selectedRole.name}
              </h2>
              {selectedRole.description && (
                <p className="text-gray-600 mt-2">{selectedRole.description}</p>
              )}
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Danh sách quyền ({selectedRole.role_permissions.length})
              </h3>
              <div className="space-y-2">
                {selectedRole.role_permissions.map((rp) => (
                  <div
                    key={rp.permission.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {resourceLabels[rp.permission.resource] || rp.permission.resource}
                      </div>
                      <div className="text-sm text-gray-600">
                        {rp.permission.action}
                      </div>
                    </div>
                    {rp.permission.description && (
                      <div className="text-sm text-gray-500">
                        {rp.permission.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedRole(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
