'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, Briefcase } from 'lucide-react';

interface Position {
  id: number;
  code: string;
  name: string;
  description?: string;
  level?: number;
  is_active: boolean;
  _count?: {
    users: number;
  };
}

export default function PositionsPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    level: '',
  });

  // Fetch positions
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const response = await fetchJson('/positions') as any;
      return response.positions || [];
    },
    refetchOnMount: 'always',
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await fetchJson('/positions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast.success('Tạo chức danh thành công!');
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await fetchJson(`/positions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast.success('Cập nhật chức danh thành công!');
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await fetchJson(`/positions/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast.success('Xóa chức danh thành công!');
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra');
    },
  });

  const handleOpenDialog = (position?: Position) => {
    if (position) {
      setEditingPosition(position);
      setFormData({
        code: position.code,
        name: position.name,
        description: position.description || '',
        level: position.level?.toString() || '',
      });
    } else {
      setEditingPosition(null);
      setFormData({ code: '', name: '', description: '', level: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPosition(null);
    setFormData({ code: '', name: '', description: '', level: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      code: formData.code,
      name: formData.name,
      description: formData.description || undefined,
      level: formData.level ? parseInt(formData.level) : undefined,
    };

    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (position: Position) => {
    if (position._count?.users && position._count.users > 0) {
      toast.error(`Không thể xóa! Có ${position._count.users} nhân viên đang giữ chức danh này.`);
      return;
    }
    
    if (confirm(`Xác nhận xóa chức danh "${position.name}"?`)) {
      deleteMutation.mutate(position.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Chức danh" description="Đang tải..." icon={Briefcase} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Quản lý Chức danh"
        description="Quản lý các chức danh trong tổ chức"
        icon={Briefcase}
        iconColor="text-violet-600"
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm chức danh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Tổng số chức danh</div>
          <div className="text-2xl font-bold">{positions.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Đang hoạt động</div>
          <div className="text-2xl font-bold text-green-600">
            {positions.filter((p: Position) => p.is_active).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Tổng nhân viên</div>
          <div className="text-2xl font-bold text-blue-600">
            {positions.reduce((sum: number, p: Position) => sum + (p._count?.users || 0), 0)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên chức danh</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cấp bậc</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {positions.map((position: Position) => (
                <tr key={position.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{position.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{position.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{position.description || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {position.level ? (
                      <Badge variant="outline">Level {position.level}</Badge>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{position._count?.users || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {position.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
                    ) : (
                      <Badge variant="secondary">Không hoạt động</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(position)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(position)}
                        disabled={!!(position._count?.users && position._count.users > 0)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPosition ? 'Chỉnh sửa chức danh' : 'Thêm chức danh mới'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Mã chức danh *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="VD: CEO, MANAGER"
                required
                disabled={!!editingPosition}
              />
              <p className="text-xs text-gray-500 mt-1">Chỉ chữ in hoa, số và dấu gạch dưới</p>
            </div>

            <div>
              <Label htmlFor="name">Tên chức danh *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Giám đốc điều hành"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả về chức danh này..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="level">Cấp bậc</Label>
              <Input
                id="level"
                type="number"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                placeholder="VD: 1 (cao nhất)"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Số càng nhỏ, cấp bậc càng cao</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy bỏ
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingPosition ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
