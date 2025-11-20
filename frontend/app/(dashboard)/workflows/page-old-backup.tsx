'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Workflow, Plus, Edit, Trash2, ArrowUp, ArrowDown, Users, User, Building2, UserCog, Settings } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Workflow}
        title="Quy trình phê duyệt"
        description="Quản lý các quy trình phê duyệt văn bản"
        iconColor="text-purple-600"
        actions={
          <Button onClick={handleCreateWorkflow}>
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
                          onClick={() => handleManageSteps(workflow)}
                          title="Quản lý các bước"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditWorkflow(workflow)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteWorkflow(workflow.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Workflow Steps */}
                    {workflow.steps.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Các bước phê duyệt ({workflow.steps.length}):
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
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Chưa có bước phê duyệt. Click <Settings className="w-3 h-3 inline" /> để thêm.
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
                onClick: handleCreateWorkflow,
              }}
            />
          )}
        </CardContent>
      </Card>

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
