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
import { Plus, Pencil, Trash2, Users, Briefcase, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    level: '',
  });

  // Fetch positions with pagination
  const { data: response, isLoading } = useQuery({
    queryKey: ['positions', currentPage, itemsPerPage, filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      if (filter === 'active') {
        params.append('is_active', 'true');
      } else if (filter === 'inactive') {
        params.append('is_active', 'false');
      }
      
      return await fetchJson<{
        positions: Position[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(`/positions?${params.toString()}`);
    },
    refetchOnMount: 'always',
  });

  const positions = response?.positions || [];
  const pagination = response?.pagination;

  // Client-side search filter
  const filteredPositions = positions.filter(position => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      position.name.toLowerCase().includes(searchLower) ||
      position.code.toLowerCase().includes(searchLower) ||
      position.description?.toLowerCase().includes(searchLower)
    );
  });

  // Reset to page 1 when filter changes
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

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
      setCurrentPage(1);
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

  const totalStats = {
    total: pagination?.total || 0,
    active: positions.filter(p => p.is_active).length,
    totalUsers: positions.reduce((sum, p) => sum + (p._count?.users || 0), 0),
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => handleFilterChange('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Tất cả {pagination && `(${pagination.total})`}
        </button>
        <button
          onClick={() => handleFilterChange('active')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'active'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Hoạt động
        </button>
        <button
          onClick={() => handleFilterChange('inactive')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'inactive'
              ? 'border-gray-600 text-gray-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Không hoạt động
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Tìm theo tên, mã, mô tả..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
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
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'Không tìm thấy chức danh nào' : 'Chưa có chức danh nào'}
                  </td>
                </tr>
              ) : (
                filteredPositions.map((position: Position) => (
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
              )))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filteredPositions.length > 0 && pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, pagination.total)} trong tổng số {pagination.total}
              </span>
              <Select 
                value={itemsPerPage.toString()} 
                onValueChange={(value) => { 
                  setItemsPerPage(parseInt(value)); 
                  setCurrentPage(1); 
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                Trang {currentPage} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pagination.totalPages)}
                disabled={currentPage >= pagination.totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
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
