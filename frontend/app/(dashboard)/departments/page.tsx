'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Users, Edit, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

interface Department {
  id: number;
  name: string;
  code?: string;
  description?: string;
  parent?: { id: number; name: string };
  manager?: { id: number; email: string; full_name?: string };
  _count: { users: number; children: number };
  children?: Department[];
}

export default function DepartmentsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const queryClient = useQueryClient();
  const { fetchJson } = useAuth();

  const createDeptMutation = useMutation({
    mutationFn: (data: { name: string; code?: string; description?: string }) => {
      if (editingDept) {
        return fetchJson(`/departments/${editingDept.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return fetchJson('/departments', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: async () => {
      setShowCreateModal(false);
      setEditingDept(null);
      setFormData({ name: '', code: '', description: '' });
      toast.success(editingDept ? 'Cập nhật thành công!' : 'Tạo phòng ban thành công!');
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['departments-tree'] });
      }, 300);
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const { data: deptData, isLoading } = useQuery({
    queryKey: ['departments-tree'],
    queryFn: () => fetchJson<any>('/departments/tree'),
    staleTime: 0, // Always refetch
    refetchOnMount: 'always', // Always refetch on mount
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (deptId: number) => fetchJson(`/departments/${deptId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments-tree'] });
    },
  });

  // Sort by ID descending (newest first) on frontend to ensure correct order
  const departments: Department[] = ((deptData as any) || []).sort((a: Department, b: Department) => b.id - a.id);

  const renderDepartment = (dept: Department, level = 0) => (
    <div key={dept.id} className="border-b last:border-0">
      <div
        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${level * 2 + 1}rem` }}
      >
        <div className="flex items-center gap-3 flex-1">
          {level > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <Building2 className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <div className="font-medium">{dept.name}</div>
            {dept.description && (
              <div className="text-sm text-muted-foreground">{dept.description}</div>
            )}
            {dept.manager && (
              <div className="text-sm text-muted-foreground mt-1">
                Quản lý: {dept.manager.full_name || dept.manager.email}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {dept._count.users}
          </Badge>
          {dept._count.children > 0 && (
            <Badge variant="outline" className="text-xs">
              {dept._count.children} phòng ban con
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setEditingDept(dept);
                setFormData({ name: dept.name, code: dept.code || '', description: dept.description || '' });
                setShowCreateModal(true);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (dept._count.users > 0) {
                  toast.error('Không thể xóa phòng ban có nhân viên');
                  return;
                }
                if (dept._count.children > 0) {
                  toast.error('Không thể xóa phòng ban có phòng ban con');
                  return;
                }
                if (confirm(`Bạn có chắc muốn xóa phòng ban "${dept.name}"?`)) {
                  deleteDeptMutation.mutate(dept.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
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
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý phòng ban</h1>
            <p className="text-muted-foreground mt-2">
              Tổ chức cấu trúc phòng ban và quản lý
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm phòng ban
          </Button>
        </div>
      </Card>

      {/* Departments Tree */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Đang tải...</div>
        ) : departments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Chưa có phòng ban nào
          </div>
        ) : (
          <div>{departments.map((dept) => renderDepartment(dept))}</div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban'}</DialogTitle>
            <DialogDescription>
              {editingDept ? 'Cập nhật thông tin phòng ban' : 'Tạo phòng ban mới trong tổ chức'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (formData.name.trim()) {
                createDeptMutation.mutate(formData);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Tên phòng ban *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên phòng ban"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Mã phòng ban *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="VD: PNS, PKD, PIT"
                required
              />
              <p className="text-xs text-muted-foreground">
                Mã duy nhất (viết hoa, không dấu)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả phòng ban"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createDeptMutation.isPending}>
                {createDeptMutation.isPending 
                  ? (editingDept ? 'Đang cập nhật...' : 'Đang tạo...') 
                  : (editingDept ? 'Cập nhật' : 'Tạo')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
