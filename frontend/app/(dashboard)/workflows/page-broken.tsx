'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Workflow, Plus, Edit, Trash2, ArrowUp, ArrowDown, Users, User, Building2, UserCog, Settings, Search, CheckCircle, XCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

interface StepFormData {
  step_name: string;
  approver_type: 'user' | 'role' | 'department' | 'manager';
  approver_user_id: string;
  approver_role_id: string;
  approver_department_id: string;
}

export default function WorkflowsPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  
  // Workflow dialog
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowData | null>(null);
  const [workflowFormData, setWorkflowFormData] = useState({ name: '', description: '' });
  
  // Step management dialog
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [managingWorkflow, setManagingWorkflow] = useState<WorkflowData | null>(null);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepFormData, setStepFormData] = useState<StepFormData>({
    step_name: '',
    approver_type: 'user',
    approver_user_id: '',
    approver_role_id: '',
    approver_department_id: '',
  });
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Fetch workflows
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const data = await fetchJson<{ workflows: WorkflowData[] }>('/workflows');
      return data.workflows;
    },
  });

  // Fetch users for approver selection
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await fetchJson<any>('/users');
      return data || [];
    },
  });

  // Fetch roles for approver selection
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const data = await fetchJson<any>('/roles');
      return data || [];
    },
  });

  // Fetch departments for approver selection
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const data = await fetchJson<any>('/departments');
      return data || [];
    },
  });

  // Save workflow mutation
  const saveWorkflowMutation = useMutation({
    mutationFn: async () => {
      const url = editingWorkflow ? `/workflows/${editingWorkflow.id}` : '/workflows';
      const method = editingWorkflow ? 'PUT' : 'POST';
      return await fetchJson(url, {
        method,
        body: JSON.stringify(workflowFormData),
      });
    },
    onSuccess: () => {
      toast.success(editingWorkflow ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
      setIsWorkflowDialogOpen(false);
      setEditingWorkflow(null);
      setWorkflowFormData({ name: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error?.message || 'Có lỗi xảy ra'}`);
    },
  });

  // Delete workflow mutation
  const deleteWorkflowMutation = useMutation({
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

  // Add step mutation
  const addStepMutation = useMutation({
    mutationFn: async () => {
      if (!managingWorkflow) return;
      
      const payload: any = {
        step_name: stepFormData.step_name,
        approver_type: stepFormData.approver_type,
      };

      // Add approver ID based on type
      if (stepFormData.approver_type === 'user' && stepFormData.approver_user_id) {
        payload.approver_user_id = parseInt(stepFormData.approver_user_id);
      } else if (stepFormData.approver_type === 'role' && stepFormData.approver_role_id) {
        payload.approver_role_id = parseInt(stepFormData.approver_role_id);
      } else if (stepFormData.approver_type === 'department' && stepFormData.approver_department_id) {
        payload.approver_department_id = parseInt(stepFormData.approver_department_id);
      }

      return await fetchJson(`/workflows/${managingWorkflow.id}/steps`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (data) => {
      toast.success('Thêm bước thành công!');
      setIsStepDialogOpen(false);
      setStepFormData({
        step_name: '',
        approver_type: 'user',
        approver_user_id: '',
        approver_role_id: '',
        approver_department_id: '',
      });
      
      // Refetch and update managingWorkflow
      await queryClient.invalidateQueries({ queryKey: ['workflows'] });
      
      // Refresh managingWorkflow with updated data
      if (managingWorkflow) {
        const updatedWorkflows = queryClient.getQueryData<WorkflowData[]>(['workflows']);
        const updated = updatedWorkflows?.find(w => w.id === managingWorkflow.id);
        if (updated) {
          setManagingWorkflow(updated);
        }
      }
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error?.message || 'Có lỗi xảy ra'}`);
    },
  });

  // Delete step mutation
  const deleteStepMutation = useMutation({
    mutationFn: async ({ workflowId, stepId }: { workflowId: number; stepId: number }) => {
      return await fetchJson(`/workflows/steps/${stepId}`, { method: 'DELETE' });
    },
    onSuccess: async (_, { stepId }) => {
      toast.success('Xóa bước thành công!');
      
      // Update managingWorkflow to remove deleted step
      if (managingWorkflow) {
        setManagingWorkflow({
          ...managingWorkflow,
          steps: managingWorkflow.steps.filter(s => s.id !== stepId),
        });
      }
      
      // Refetch workflows data
      await queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error?.message || 'Có lỗi xảy ra'}`);
    },
  });

  // Reorder step mutation
  const reorderStepMutation = useMutation({
    mutationFn: async ({ workflowId, stepId, direction }: { workflowId: number; stepId: number; direction: 'up' | 'down' }) => {
      return await fetchJson(`/workflows/${workflowId}/steps/reorder`, {
        method: 'POST',
        body: JSON.stringify({ stepId, direction }),
      });
    },
    onSuccess: async () => {
      // Refetch and update managingWorkflow
      await queryClient.invalidateQueries({ queryKey: ['workflows'] });
      
      // Refresh managingWorkflow with updated data
      if (managingWorkflow) {
        const updatedWorkflows = queryClient.getQueryData<WorkflowData[]>(['workflows']);
        const updated = updatedWorkflows?.find(w => w.id === managingWorkflow.id);
        if (updated) {
          setManagingWorkflow(updated);
        }
      }
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error?.message || 'Có lỗi xảy ra'}`);
    },
  });

  // Handlers
  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    setWorkflowFormData({ name: '', description: '' });
    setIsWorkflowDialogOpen(true);
  };

  const handleEditWorkflow = (workflow: WorkflowData) => {
    setEditingWorkflow(workflow);
    setWorkflowFormData({
      name: workflow.name,
      description: workflow.description || '',
    });
    setIsWorkflowDialogOpen(true);
  };

  const handleToggleActive = (workflow: WorkflowData) => {
    saveWorkflowMutation.mutate();
    // Update local state immediately for better UX
    setEditingWorkflow(workflow);
    setWorkflowFormData({
      name: workflow.name,
      description: workflow.description || '',
    });
    // Then save with toggled is_active
    setTimeout(() => {
      saveWorkflowMutation.mutate();
    }, 0);
  };

  // Filter workflows
  const filteredWorkflows = workflows?.filter(workflow => {
    const matchesSearch = !searchQuery || 
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && workflow.is_active) ||
      (statusFilter === 'inactive' && !workflow.is_active);
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleDeleteWorkflow = (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa quy trình này?')) {
      deleteWorkflowMutation.mutate(id);
    }
  };

  const handleManageSteps = (workflow: WorkflowData) => {
    setManagingWorkflow(workflow);
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setStepFormData({
      step_name: '',
      approver_type: 'user',
      approver_user_id: '',
      approver_role_id: '',
      approver_department_id: '',
    });
    setIsStepDialogOpen(true);
  };

  const handleDeleteStep = (workflowId: number, stepId: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa bước này?')) {
      deleteStepMutation.mutate({ workflowId, stepId });
    }
  };

  const handleReorderStep = (workflowId: number, stepId: number, direction: 'up' | 'down') => {
    reorderStepMutation.mutate({ workflowId, stepId, direction });
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

  const displayWorkflows = filteredWorkflows;
  
  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Đang hoạt động
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Tạm dừng
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Quy trình Phê duyệt</h1>
          <p className="text-sm text-gray-500 mt-1">Tạo và quản lý các quy trình phê duyệt văn bản</p>
        </div>
        <Button onClick={handleCreateWorkflow} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Tạo quy trình mới
        </Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Tìm theo tên quy trình..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Tất cả
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Đang hoạt động
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
              >
                Tạm dừng
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayWorkflows && displayWorkflows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayWorkflows.map((workflow) => (
            <Card 
              key={workflow.id} 
              className="hover:shadow-lg transition-shadow border-l-4"
              style={{ borderLeftColor: workflow.is_active ? '#10b981' : '#9ca3af' }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">
                      {workflow.name}
                    </h3>
                    {getStatusBadge(workflow.is_active)}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {workflow.description || 'Chưa có mô tả'}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Số bước:</span>
                    <span className="font-medium text-gray-900">{workflow.steps?.length || 0} bước</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditWorkflow(workflow)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                    <button
                      onClick={() => handleManageSteps(workflow)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Quản lý bước"
                    >
                      <Settings className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={workflow.is_active}
                      onCheckedChange={() => handleToggleActive(workflow)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'Không tìm thấy quy trình' : 'Chưa có quy trình nào'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                : 'Tạo quy trình phê duyệt đầu tiên của bạn'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={handleCreateWorkflow} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Tạo quy trình mới
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {/* Create/Edit Workflow Dialog */}
      <Dialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen}>
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
                value={workflowFormData.name}
                onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })}
                placeholder="VD: Phê duyệt hợp đồng"
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={workflowFormData.description}
                onChange={(e) => setWorkflowFormData({ ...workflowFormData, description: e.target.value })}
                placeholder="Mô tả quy trình..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkflowDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => saveWorkflowMutation.mutate()}
              disabled={!workflowFormData.name.trim() || saveWorkflowMutation.isPending}
            >
              {saveWorkflowMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step Management Dialog */}
      <Dialog open={!!managingWorkflow} onOpenChange={(open) => !open && setManagingWorkflow(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Quản lý các bước: {managingWorkflow?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {managingWorkflow?.steps && managingWorkflow.steps.length > 0 ? (
              <div className="space-y-2">
                {managingWorkflow.steps
                  .sort((a, b) => a.step_order - b.step_order)
                  .map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
                    >
                      <span className="text-sm font-medium text-gray-500 w-8">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{step.step_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          {getApproverIcon(step.approver_type)}
                          <span>{getApproverLabel(step.approver_type)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReorderStep(managingWorkflow.id, step.id, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReorderStep(managingWorkflow.id, step.id, 'down')}
                          disabled={index === managingWorkflow.steps.length - 1}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteStep(managingWorkflow.id, step.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có bước phê duyệt nào
              </div>
            )}
            
            <Button onClick={handleAddStep} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Thêm bước mới
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setManagingWorkflow(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Step Dialog */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm bước phê duyệt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tên bước *</Label>
              <Input
                value={stepFormData.step_name}
                onChange={(e) => setStepFormData({ ...stepFormData, step_name: e.target.value })}
                placeholder="VD: Phê duyệt cấp trưởng phòng"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Loại người phê duyệt *</Label>
              <select
                value={stepFormData.approver_type}
                onChange={(e) => setStepFormData({ 
                  ...stepFormData, 
                  approver_type: e.target.value as any,
                  approver_user_id: '',
                  approver_role_id: '',
                  approver_department_id: '',
                })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="user">Người dùng cụ thể</option>
                <option value="role">Vai trò</option>
                <option value="department">Phòng ban</option>
                <option value="manager">Quản lý trực tiếp</option>
              </select>
            </div>

            {stepFormData.approver_type === 'user' && (
              <div className="space-y-2">
                <Label>Chọn người dùng *</Label>
                <select
                  value={stepFormData.approver_user_id}
                  onChange={(e) => setStepFormData({ ...stepFormData, approver_user_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">-- Chọn người dùng --</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {stepFormData.approver_type === 'role' && (
              <div className="space-y-2">
                <Label>Chọn vai trò *</Label>
                <select
                  value={stepFormData.approver_role_id}
                  onChange={(e) => setStepFormData({ ...stepFormData, approver_role_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">-- Chọn vai trò --</option>
                  {roles?.map((role: any) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {stepFormData.approver_type === 'department' && (
              <div className="space-y-2">
                <Label>Chọn phòng ban *</Label>
                <select
                  value={stepFormData.approver_department_id}
                  onChange={(e) => setStepFormData({ ...stepFormData, approver_department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">-- Chọn phòng ban --</option>
                  {departments?.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {stepFormData.approver_type === 'manager' && (
              <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-md">
                ℹ️ Người phê duyệt sẽ là quản lý trực tiếp của người tạo văn bản
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStepDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => addStepMutation.mutate()}
              disabled={!stepFormData.step_name.trim() || addStepMutation.isPending}
            >
              {addStepMutation.isPending ? 'Đang thêm...' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
