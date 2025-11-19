'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

interface User {
  id: number;
  email: string;
  full_name?: string;
  phone?: string;
  status: string;
  department?: { id: number; name: string };
  user_roles: Array<{ role: { id: number; name: string } }>;
  created_at: string;
}

interface Department {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    department_id: '',
    role_ids: [] as number[],
  });
  const queryClient = useQueryClient();

  const { fetchJson } = useAuth();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      return fetchJson<any>(`/users?${params}`);
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => fetchJson<any>('/departments'),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchJson<any>('/roles'),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingUser) {
        const { email, ...updateData } = data;
        return fetchJson(`/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      }
      return fetchJson('/users', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      setShowCreateModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', full_name: '', phone: '', department_id: '', role_ids: [] });
      toast.success(editingUser ? 'Cập nhật người dùng thành công!' : 'Tạo người dùng thành công!');
      setTimeout(() => queryClient.refetchQueries({ queryKey: ['users'] }), 300);
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => fetchJson(`/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Xóa người dùng thành công!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const users: User[] = ((usersData as any) || []).sort((a: User, b: User) => b.id - a.id);
  const departments: Department[] = (departmentsData as any) || [];
  const roles: Role[] = (rolesData as any) || [];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý người dùng</h1>
            <p className="text-muted-foreground mt-2">
              Quản lý tài khoản, phân quyền và phòng ban
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm người dùng
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm kiếm theo email hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Đang tải...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Không có người dùng nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Người dùng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Phòng ban
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">
                          {user.full_name || user.email}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {user.phone && (
                          <div className="text-sm text-muted-foreground">{user.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">
                        {user.department?.name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.user_roles.map((ur) => (
                          <Badge key={ur.role.id} variant="secondary" className="gap-1">
                            <Shield className="w-3 h-3" />
                            {ur.role.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingUser(user);
                            setFormData({
                              email: user.email,
                              password: '',
                              full_name: user.full_name || '',
                              phone: user.phone || '',
                              department_id: user.department?.id?.toString() || '',
                              role_ids: user.user_roles.map(ur => ur.role.id),
                            });
                            setShowCreateModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Bạn có chắc muốn xóa người dùng này?')) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          setEditingUser(null);
          setFormData({ email: '', password: '', full_name: '', phone: '', department_id: '', role_ids: [] });
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Cập nhật thông tin người dùng' : 'Tạo tài khoản người dùng mới'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const submitData: any = {
                ...formData,
                department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
              };
              if (!editingUser && !submitData.password) {
                toast.error('Vui lòng nhập mật khẩu');
                return;
              }
              if (editingUser && !submitData.password) {
                delete submitData.password;
              }
              createUserMutation.mutate(submitData);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
                disabled={!!editingUser}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Mật khẩu {editingUser ? '(để trống nếu không đổi)' : '*'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required={!editingUser}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0912345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department_id">Phòng ban</Label>
              <select
                id="department_id"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
              >
                <option value="">-- Chọn phòng ban --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Vai trò *</Label>
              <div className="border border-input rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.role_ids.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, role_ids: [...formData.role_ids, role.id] });
                        } else {
                          setFormData({ ...formData, role_ids: formData.role_ids.filter(id => id !== role.id) });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{role.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingUser(null);
                  setFormData({ email: '', password: '', full_name: '', phone: '', department_id: '', role_ids: [] });
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending 
                  ? (editingUser ? 'Đang cập nhật...' : 'Đang tạo...') 
                  : (editingUser ? 'Cập nhật' : 'Tạo')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
