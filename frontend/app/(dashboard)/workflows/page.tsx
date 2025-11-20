'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Workflow, Plus, Edit, Trash2, ArrowUp, ArrowDown, Users, User, Building2, UserCog } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface WorkflowStep {
  id: number;
  step_order: number;
  step_name: string;
  approver_type: 'user' | 'role' | 'department' | 'manager';
  approver_user_id: number | null;
  approver_role_id: number | null;
  approver_department_id: number | null;
}

interface WorkflowData {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  steps: WorkflowStep[];
}

export default function WorkflowsPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowData | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const data = await fetchJson<{ workflows: WorkflowData[] }>('/workflows');
      return data.workflows;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingWorkflow ? `/workflows/${editingWorkflow.id}` : '/workflows';
      const method = editingWorkflow ? 'PUT' : 'POST';
      return await fetchJson(url, {
        method,
        body: JSON.stringify(formData),
      });
    },
    onSuccess: () => {
      toast.success(editingWorkflow ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
      setIsDialogOpen(false);
      setEditingWorkflow(null);
      setFormData({ name: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error?.message || 'Có lỗi xảy ra'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await fetchJson(`/workflows/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Xóa thành công!');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error?.message || 'Có lỗi xảy ra'}`);
    },
  });

  const handleCreate = () => {
    setEditingWorkflow(null);
    setFormData({ name: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (workflow: WorkflowData) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa quy trình này?')) {
      deleteMutation.mutate(id);
    }
  };

  const getApproverIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4" />;
      case 'role': return <UserCog className="w-4 h-4" />;
      case 'department': return <Building2 className="w-4 h-4" />;
      case 'manager': return <Users className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getApproverLabel = (type: string) => {
    switch (type) {
      case 'user': return 'Người dùng';
      case 'role': return 'Vai trò';
      case 'department': return 'Phòng ban';
      case 'manager': return 'Quản lý';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Workflow}
        title="Quy trình phê duyệt"
        description="Quản lý các quy trình phê duyệt văn bản"
        iconColor="text-purple-600"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo quy trình
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : workflows && workflows.length > 0 ? (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{workflow.name}</h3>
                          <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                            {workflow.is_active ? 'Hoạt động' : 'Tạm dừng'}
                          </Badge>
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {workflow.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(workflow)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(workflow.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Workflow Steps */}
                    {workflow.steps.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Các bước phê duyệt:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {workflow.steps
                            .sort((a, b) => a.step_order - b.step_order)
                            .map((step, index) => (
                              <div
                                key={step.id}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border"
                              >
                                <span className="text-xs font-medium text-gray-500">
                                  {index + 1}.
                                </span>
                                <span className="text-sm font-medium">{step.step_name}</span>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {getApproverIcon(step.approver_type)}
                                  <span>{getApproverLabel(step.approver_type)}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Workflow}
              title="Chưa có quy trình nào"
              description="Tạo quy trình phê duyệt đầu tiên"
              action={{
                label: 'Tạo quy trình',
                onClick: handleCreate,
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? 'Chỉnh sửa quy trình' : 'Tạo quy trình mới'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên quy trình *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Phê duyệt hợp đồng"
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả quy trình..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!formData.name.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
