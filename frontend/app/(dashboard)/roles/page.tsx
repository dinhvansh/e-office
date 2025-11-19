'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Users, Edit, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

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
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();
  const { fetchJson } = useAuth();

  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => {
      if (editingRole) {
        console.log('Updating role:', editingRole.id, data);
        return fetchJson(`/roles/${editingRole.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      console.log('Creating role:', data);
      return fetchJson('/roles', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: async () => {
      console.log(editingRole ? 'Role updated successfully' : 'Role created successfully');
      setShowCreateModal(false);
      setEditingRole(null);
      setFormData({ name: '', description: '' });
      toast.success(editingRole ? 'Cập nhật vai trò thành công!' : 'Tạo vai trò thành công!');
      // Small delay to ensure backend has saved
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['roles'] });
        console.log('Refetched roles');
      }, 300);
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchJson<any>('/roles'),
    staleTime: 0, // Always refetch
    refetchOnMount: 'always', // Always refetch on mount
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: number) => fetchJson(`/roles/${roleId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  // Sort by ID descending (newest first)
  const roles: Role[] = ((rolesData as any) || []).sort((a: Role, b: Role) => b.id - a.id);

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
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý vai trò</h1>
            <p className="text-muted-foreground mt-2">
              Phân quyền và quản lý vai trò người dùng
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo vai trò mới
          </Button>
        </div>
      </Card>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            Đang tải...
          </div>
        ) : roles.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            Chưa có vai trò nào
          </div>
        ) : (
          roles.map((role) => {
            const permissions = groupPermissions(role);
            return (
              <Card key={role.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {role.name}
                        {role.is_system && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Hệ thống
                          </Badge>
                        )}
                      </CardTitle>
                      {role.description && (
                        <CardDescription className="mt-1">
                          {role.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{role._count.user_roles} người dùng</span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Quyền:</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(permissions).map(([resource, actions]) => (
                        <Badge key={resource} variant="outline" className="text-xs">
                          {resourceLabels[resource] || resource}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedRole(role)}
                  >
                    Xem chi tiết
                  </Button>
                  {!role.is_system && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingRole(role);
                          setFormData({ name: role.name, description: role.description || '' });
                          setShowCreateModal(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (role._count.user_roles > 0) {
                            toast.error('Không thể xóa vai trò đang được sử dụng');
                            return;
                          }
                          if (confirm(`Bạn có chắc muốn xóa vai trò "${role.name}"?`)) {
                            deleteRoleMutation.mutate(role.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      {/* Role Detail Modal */}
      <Dialog open={!!selectedRole} onOpenChange={(open) => !open && setSelectedRole(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              {selectedRole?.name}
            </DialogTitle>
            {selectedRole?.description && (
              <DialogDescription>{selectedRole.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">
                Danh sách quyền ({selectedRole?.role_permissions.length || 0})
              </h3>
              <div className="space-y-2">
                {selectedRole?.role_permissions.map((rp) => (
                  <div
                    key={rp.permission.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {resourceLabels[rp.permission.resource] || rp.permission.resource}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {rp.permission.action}
                      </div>
                    </div>
                    {rp.permission.description && (
                      <div className="text-sm text-muted-foreground">
                        {rp.permission.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRole(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          setEditingRole(null);
          setFormData({ name: '', description: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}</DialogTitle>
            <DialogDescription>
              {editingRole 
                ? 'Cập nhật thông tin vai trò' 
                : 'Sau khi tạo, bạn có thể assign permissions cho vai trò này.'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (formData.name.trim()) {
                createRoleMutation.mutate(formData);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Tên vai trò *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên vai trò"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả vai trò"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRole(null);
                  setFormData({ name: '', description: '' });
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createRoleMutation.isPending}>
                {createRoleMutation.isPending 
                  ? (editingRole ? 'Đang cập nhật...' : 'Đang tạo...') 
                  : (editingRole ? 'Cập nhật' : 'Tạo')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
