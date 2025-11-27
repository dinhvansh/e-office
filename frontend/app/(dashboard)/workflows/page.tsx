'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Workflow, Plus, Edit, Trash2, ArrowUp, ArrowDown, Users, User, Building2, UserCog, Settings, FileText, Clock, Search } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface WorkflowStep {
  id: number;
  step_order: number;
  step_name: string;
  approver_type: 'user' | 'role' | 'department' | 'manager';
  approver_user_id: number | null;
  approver_role_id: number | null;
  approver_department_id: number | null;
  participant_role: 'approver' | 'signer';
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
  participant_role: 'approver' | 'signer';
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
    participant_role: 'approver',
  });

  // Confirm dialogs
  const [deleteWorkflowConfirm, setDeleteWorkflowConfirm] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  const [deleteStepConfirm, setDeleteStepConfirm] = useState<{ open: boolean; workflowId: number | null; stepId: number | null }>({
    open: false,
    workflowId: null,
    stepId: null,
  });

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

  // Toggle workflow active status mutation
  const toggleWorkflowMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      return await fetchJson(`/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active }),
      });
    },
    onSuccess: () => {
      toast.success('Cập nhật trạng thái thành công!');
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
        participant_role: stepFormData.participant_role,
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
        participant_role: 'approver',
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

  const handleDeleteWorkflow = (id: number) => {
    setDeleteWorkflowConfirm({ open: true, id });
  };

  const confirmDeleteWorkflow = () => {
    if (deleteWorkflowConfirm.id) {
      deleteWorkflowMutation.mutate(deleteWorkflowConfirm.id);
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
      participant_role: 'approver',
    });
    setIsStepDialogOpen(true);
  };

  const handleDeleteStep = (workflowId: number, stepId: number) => {
    setDeleteStepConfirm({ open: true, workflowId, stepId });
  };

  const confirmDeleteStep = () => {
    if (deleteStepConfirm.workflowId && deleteStepConfirm.stepId) {
      deleteStepMutation.mutate({ 
        workflowId: deleteStepConfirm.workflowId, 
        stepId: deleteStepConfirm.stepId 
      });
    }
  };

  const handleReorderStep = (workflowId: number, stepId: number, direction: 'up' | 'down') => {
    reorderStepMutation.mutate({ workflowId, stepId, direction });
  };

  const handleToggleWorkflow = (id: number, currentStatus: boolean) => {
    toggleWorkflowMutation.mutate({ id, is_active: !currentStatus });
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

  // Filter workflows
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorkflows = Array.isArray(workflows) ? workflows.filter((workflow) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && workflow.is_active) ||
      (statusFilter === 'paused' && !workflow.is_active);

    const matchesSearch =
      !searchQuery ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  }) : [];

  // Count by status
  const counts = {
    all: Array.isArray(workflows) ? workflows.length : 0,
    active: Array.isArray(workflows) ? workflows.filter((w) => w.is_active).length : 0,
    paused: Array.isArray(workflows) ? workflows.filter((w) => !w.is_active).length : 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Workflow}
        title="Quản lý Quy trình Phê duyệt"
        description="Quản lý các quy trình phê duyệt văn bản"
        iconColor="text-blue-600"
        actions={
          <Button onClick={handleCreateWorkflow} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Tạo quy trình mới
          </Button>
        }
      />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search - Left */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm theo tên quy trình..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs - Right */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className={statusFilter === 'all' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-gray-100'}
          >
            Tất cả
            <Badge variant="secondary" className="ml-2 bg-white text-gray-700">{counts.all}</Badge>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('active')}
            className={statusFilter === 'active' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-gray-100'}
          >
            Đang hoạt động
            <Badge variant="secondary" className="ml-2 bg-white text-gray-700">{counts.active}</Badge>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'paused' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('paused')}
            className={statusFilter === 'paused' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-gray-100'}
          >
            Tạm dừng
            <Badge variant="secondary" className="ml-2 bg-white text-gray-700">{counts.paused}</Badge>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredWorkflows.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={Workflow}
              title={searchQuery ? 'Không tìm thấy quy trình' : 'Chưa có quy trình nào'}
              description={searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo quy trình phê duyệt đầu tiên'}
              action={!searchQuery ? {
                label: 'Tạo quy trình',
                onClick: handleCreateWorkflow,
              } : undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Card Grid */}
      {!isLoading && filteredWorkflows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((workflow) => (
            <Card 
              key={workflow.id} 
              className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
                workflow.is_active 
                  ? 'border-l-green-500 bg-white' 
                  : 'border-l-gray-400 bg-gray-50'
              }`}
            >
              <CardContent className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">{workflow.name}</h3>
                    <Badge
                      variant={workflow.is_active ? 'default' : 'secondary'}
                      className={workflow.is_active 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-400 text-white'}
                    >
                      <span className="mr-1">●</span>
                      {workflow.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {workflow.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
                    {workflow.description}
                  </p>
                )}

                {/* Info */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>Loại văn bản: <span className="font-medium text-gray-900">{workflow.description || 'Chung'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-gray-500" />
                    <span><span className="font-medium text-gray-900">{workflow.steps.length}</span> bước</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleManageSteps(workflow)}
                      title="Quản lý các bước"
                      className="hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditWorkflow(workflow)}
                      title="Chỉnh sửa"
                      className="hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      title="Xóa"
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Switch 
                    checked={workflow.is_active}
                    onCheckedChange={() => handleToggleWorkflow(workflow.id, workflow.is_active)}
                    disabled={toggleWorkflowMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{step.step_name}</span>
                          <Badge 
                            variant={step.participant_role === 'signer' ? 'default' : 'secondary'}
                            className={step.participant_role === 'signer' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'}
                          >
                            {step.participant_role === 'signer' ? '✍️ Người ký' : '✅ Người phê duyệt'}
                          </Badge>
                        </div>
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
              <Label>Vai trò *</Label>
              <select
                value={stepFormData.participant_role}
                onChange={(e) => setStepFormData({ 
                  ...stepFormData, 
                  participant_role: e.target.value as 'approver' | 'signer',
                })}
                className="w-full px-3 py-2 border rounded-md bg-purple-50 border-purple-300 focus:border-purple-500"
              >
                <option value="approver">✅ Người phê duyệt</option>
                <option value="signer">✍️ Người ký</option>
              </select>
              <p className="text-xs text-muted-foreground">
                💡 Người phê duyệt: Chỉ approve trong hệ thống. Người ký: Ký trực tiếp lên văn bản.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Loại người {stepFormData.participant_role === 'approver' ? 'phê duyệt' : 'ký'} *</Label>
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

      {/* Confirm Delete Workflow Dialog */}
      <ConfirmDialog
        open={deleteWorkflowConfirm.open}
        onOpenChange={(open) => setDeleteWorkflowConfirm({ open, id: null })}
        onConfirm={confirmDeleteWorkflow}
        title="Xác nhận xóa quy trình"
        description="Bạn có chắc chắn muốn xóa vĩnh viễn quy trình này? Hành động này không thể hoàn tác."
        confirmText="Xóa quy trình"
        cancelText="Hủy bỏ"
        variant="danger"
        icon="trash"
      />

      {/* Confirm Delete Step Dialog */}
      <ConfirmDialog
        open={deleteStepConfirm.open}
        onOpenChange={(open) => setDeleteStepConfirm({ open, workflowId: null, stepId: null })}
        onConfirm={confirmDeleteStep}
        title="Xác nhận xóa bước"
        description="Bạn có chắc chắn muốn xóa bước này khỏi quy trình? Hành động này không thể hoàn tác."
        confirmText="Xóa bước"
        cancelText="Hủy bỏ"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}
