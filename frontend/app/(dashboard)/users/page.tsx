'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Shield, Users as UsersIcon, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusTag } from '@/components/ui/status-tag';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import { ApproveRejectDialog } from '@/components/users/ApproveRejectDialog';

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
  const [approveRejectDialog, setApproveRejectDialog] = useState<{
    open: boolean;
    user: User | null;
    action: 'approve' | 'reject';
  }>({ open: false, user: null, action: 'approve' });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    department_id: '',
    position_id: '',
    manager_id: '',
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
    refetchOnWindowFocus: true,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => fetchJson<any>('/departments'),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchJson<any>('/roles'),
  });

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: () => fetchJson<any>('/positions'),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingUser) {
        const { email, ...updateData } = data;
        return fetchJson(`/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      }
      return fetchJson('/users', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: async () => {
      setShowCreateModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', full_name: '', phone: '', department_id: '', position_id: '', manager_id: '', role_ids: [] });
      toast.success(editingUser ? 'Cập nhật người dùng thành công!' : 'Tạo người dùng thành công!');
      
      // Invalidate all queries that start with 'users' (includes filters)
      await queryClient.invalidateQueries({ 
        queryKey: ['users'],
        refetchType: 'all' 
      });
      
      // Also invalidate departments for org chart
      await queryClient.invalidateQueries({ 
        queryKey: ['departments'],
        refetchType: 'all'
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ['departments-tree'],
        refetchType: 'all'
      });
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

  const approveUserMutation = useMutation({
    mutationFn: (userId: number) => fetchJson(`/users/${userId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Phê duyệt người dùng thành công!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) => 
      fetchJson(`/users/${userId}/reject`, { 
        method: 'POST',
        body: JSON.stringify({ reason })
      }),
    onSuccess: () => {
      toast.success('Từ chối người dùng thành công!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const handleApproveReject = async (userId: number, reason?: string) => {
    if (approveRejectDialog.action === 'approve') {
      await approveUserMutation.mutateAsync(userId);
    } else {
      await rejectUserMutation.mutateAsync({ userId, reason: reason || '' });
    }
  };

  const users: User[] = ((usersData as any) || []).sort((a: User, b: User) => b.id - a.id);
  const departments: Department[] = (departmentsData as any) || [];
  const roles: Role[] = (rolesData as any) || [];
  const positions = ((positionsData as any)?.positions || []).filter((p: any) => p.is_active);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UsersIcon}
        title="Quản lý người dùng"
        description="Quản lý tài khoản, phân quyền và phòng ban"
        iconColor="text-indigo-600"
        actions={
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30">
            <Plus className="w-4 h-4 mr-2" />
            Thêm người dùng
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4 shadow-md border-slate-200">
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
            <option value="pending">Chờ duyệt</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Chưa có người dùng"
            description="Bắt đầu bằng cách thêm người dùng đầu tiên vào hệ thống"
            action={{
              label: "Thêm người dùng",
              onClick: () => setShowCreateModal(true),
            }}
          />
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
                    Chức danh
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quản lý
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
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
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
                      <span className="text-sm">
                        {(user as any).position?.name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">
                        {(user as any).manager?.full_name || (user as any).manager?.email || '-'}
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
                      {user.status === 'pending' ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          Chờ duyệt
                        </Badge>
                      ) : user.status === 'rejected' ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                          Đã từ chối
                        </Badge>
                      ) : (
                        <StatusTag 
                          status={user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'pending' ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => setApproveRejectDialog({ open: true, user, action: 'approve' })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Phê duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setApproveRejectDialog({ open: true, user, action: 'reject' })}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Từ chối
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="hover:bg-primary/10 hover:text-primary transition-colors"
                              onClick={() => {
                                setEditingUser(user);
                                setFormData({
                                  email: user.email,
                                  password: '',
                                  full_name: user.full_name || '',
                                  phone: user.phone || '',
                                  department_id: user.department?.id?.toString() || '',
                                  position_id: (user as any).position_id?.toString() || '',
                                  manager_id: (user as any).manager_id?.toString() || '',
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
                              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                              onClick={() => {
                                if (confirm('Bạn có chắc muốn xóa người dùng này?')) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
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
          setFormData({ email: '', password: '', full_name: '', phone: '', department_id: '', position_id: '', manager_id: '', role_ids: [] });
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                position_id: formData.position_id ? parseInt(formData.position_id) : undefined,
                manager_id: formData.manager_id ? parseInt(formData.manager_id) : undefined,
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
              <Label htmlFor="position_id">Chức danh</Label>
              <select
                id="position_id"
                value={formData.position_id}
                onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
              >
                <option value="">-- Chọn chức danh --</option>
                {positions.map((pos: any) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name} ({pos.code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Chức danh công việc của nhân viên
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager_id">Quản lý trực tiếp</Label>
              <select
                id="manager_id"
                value={formData.manager_id}
                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
              >
                <option value="">-- Không có --</option>
                {users.filter((u: User) => u.id !== editingUser?.id).map((user: User) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Dùng cho workflow "Quản lý trực tiếp"
              </p>
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
                  setFormData({ email: '', password: '', full_name: '', phone: '', department_id: '', position_id: '', manager_id: '', role_ids: [] });
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

      {/* Approve/Reject Dialog */}
      <ApproveRejectDialog
        open={approveRejectDialog.open}
        onClose={() => setApproveRejectDialog({ open: false, user: null, action: 'approve' })}
        user={approveRejectDialog.user}
        action={approveRejectDialog.action}
        onConfirm={handleApproveReject}
      />
    </div>
  );
}
