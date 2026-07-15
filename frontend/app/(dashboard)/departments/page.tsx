'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Edit, Trash2, Search, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OrgChart } from '@/components/org-chart/OrgChart';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  parent_id?: number;
  is_active: boolean;
  parent?: { id: number; name: string };
  manager?: { id: number; email: string; full_name?: string };
  _count: { users: number; children: number };
  children?: Department[];
  created_at: string;
}

const EMPTY_DEPARTMENTS: Department[] = [];

export default function DepartmentsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', parent_id: '' });
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const queryClient = useQueryClient();
  const { fetchJson } = useAuth();

  // Fetch departments tree
  const { data: deptData, isLoading } = useQuery({
    queryKey: ['departments-tree'],
    queryFn: () => fetchJson<Department[]>('/departments/tree'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const departments: Department[] = (deptData as Department[] | undefined) ?? EMPTY_DEPARTMENTS;

  // Flatten tree for table view
  const flattenDepartments = (depts: Department[]): Department[] => {
    const result: Department[] = [];
    const flatten = (dept: Department) => {
      result.push(dept);
      if (dept.children) {
        dept.children.forEach(flatten);
      }
    };
    depts.forEach(flatten);
    return result;
  };

  const allDepartments = useMemo(() => flattenDepartments(departments), [departments]);

  // Get children of selected department
  const selectedDepartment = useMemo(() => {
    if (!selectedDepartmentId) return null;
    const findDept = (depts: Department[]): Department | null => {
      for (const dept of depts) {
        if (dept.id === selectedDepartmentId) return dept;
        if (dept.children) {
          const found = findDept(dept.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findDept(departments);
  }, [departments, selectedDepartmentId]);

  const displayedDepartments = useMemo(() => {
    let depts = selectedDepartmentId && selectedDepartment
      ? allDepartments.filter(d => d.parent_id === selectedDepartmentId)
      : allDepartments;

    if (searchQuery) {
      depts = depts.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return depts;
  }, [selectedDepartmentId, selectedDepartment, allDepartments, searchQuery]);

  // Mutations
  const createDeptMutation = useMutation({
    mutationFn: (data: { name: string; code?: string; description?: string; parent_id?: number }) => {
      if (editingDept) {
        return fetchJson(`/departments/${editingDept.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return fetchJson('/departments', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      setShowCreateModal(false);
      setEditingDept(null);
      setFormData({ name: '', code: '', description: '', parent_id: '' });
      toast.success(editingDept ? 'Cập nhật thành công!' : 'Tạo phòng ban thành công!');
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['departments-tree'] });
      }, 300);
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(message);
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (deptId: number) => fetchJson(`/departments/${deptId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleteConfirm({ open: false, id: null });
      toast.success('Xóa phòng ban thành công!');
      queryClient.invalidateQueries({ queryKey: ['departments-tree'] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(message);
    },
  });

  const handleDelete = (dept: Department) => {
    if (dept._count.users > 0) {
      toast.error('Không thể xóa phòng ban có nhân viên');
      return;
    }
    if (dept._count.children > 0) {
      toast.error('Không thể xóa phòng ban có phòng ban con');
      return;
    }
    setDeleteConfirm({ open: true, id: dept.id });
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
      parent_id: dept.parent_id?.toString() || '',
    });
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Quản lý phòng ban"
        description="Sơ đồ tổ chức và quản lý phòng ban"
        iconColor="text-blue-600"
        actions={
          <Button onClick={() => {
            setEditingDept(null);
            setFormData({
              name: '',
              code: '',
              description: '',
              parent_id: selectedDepartmentId?.toString() || '',
            });
            setShowCreateModal(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm phòng ban
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Building2}
              title="Chưa có phòng ban"
              description="Tạo phòng ban đầu tiên để bắt đầu"
              action={{
                label: "Thêm phòng ban",
                onClick: () => setShowCreateModal(true)
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          {/* Left: Org Tree */}
          <Card className="h-fit">
            <CardContent className="p-4">
              <OrgChart
                departments={allDepartments}
                selectedDepartmentId={selectedDepartmentId}
                onDepartmentSelect={setSelectedDepartmentId}
                onAddChild={(dept) => {
                  setEditingDept(null);
                  setFormData({
                    name: '',
                    code: '',
                    description: '',
                    parent_id: dept.id.toString(),
                  });
                  setShowCreateModal(true);
                }}
                onEdit={(dept) => handleEdit(dept as any)}
                onDelete={(dept) => handleDelete(dept as any)}
              />
            </CardContent>
          </Card>

          {/* Right: Department Details Table */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedDepartment ? selectedDepartment.name : 'Tất cả phòng ban'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {displayedDepartments.length} phòng ban
                    </p>
                  </div>
                  {selectedDepartmentId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDepartmentId(null)}
                    >
                      Xem tất cả
                    </Button>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm theo tên hoặc mã..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Table */}
                {displayedDepartments.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-sm">Tên phòng ban</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Mã</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Trưởng phòng</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Nhân viên</th>
                          <th className="text-left py-3 px-4 font-medium text-sm">Trạng thái</th>
                          <th className="text-right py-3 px-4 font-medium text-sm">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedDepartments.map((dept) => (
                          <tr key={dept.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium">{dept.name}</div>
                              {dept.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {dept.description}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-600">{dept.code}</td>
                            <td className="py-3 px-4">
                              {dept.manager ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">
                                    {dept.manager.full_name || dept.manager.email}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">Chưa có</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">
                                {dept._count.users}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                                {dept.is_active ? 'Hoạt động' : 'Tạm dừng'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(dept)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(dept)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <div className="text-sm">
                      {searchQuery ? 'Không tìm thấy phòng ban' : 'Chưa có phòng ban con'}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          setEditingDept(null);
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban mới'}
            </DialogTitle>
            <DialogDescription>
              {editingDept ? 'Cập nhật thông tin phòng ban' : 'Tạo phòng ban mới trong hệ thống'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const data: any = {
              name: formData.name,
              code: formData.code,
              description: formData.description,
            };
            if (formData.parent_id) {
              data.parent_id = parseInt(formData.parent_id);
            }
            createDeptMutation.mutate(data);
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên phòng ban *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Phòng Nhân sự"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Mã phòng ban *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="HR"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_id">Phòng ban cha</Label>
                <select
                  id="parent_id"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">-- Không có (Root) --</option>
                  {allDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id} disabled={editingDept?.id === dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả về chức năng và nhiệm vụ"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingDept(null);
                }}
              >
                Hủy
              </Button>
              <Button type="submit">
                {editingDept ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, id: null })}
        onConfirm={() => {
          if (deleteConfirm.id) {
            deleteDeptMutation.mutate(deleteConfirm.id);
          }
        }}
        title="Xác nhận xóa phòng ban"
        description="Bạn có chắc chắn muốn xóa phòng ban này? Hành động này không thể hoàn tác."
        confirmText="Xóa phòng ban"
        cancelText="Hủy bỏ"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
