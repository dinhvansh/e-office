'use client';

import { KeyboardEvent, MouseEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Workflow, Plus, Edit, Trash2, ArrowUp, ArrowDown, Users, User, Building2, Briefcase, Settings, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  approvalModeTranslationKeys,
  DEFAULT_APPROVAL_MODE,
  normalizeApprovalMode,
  type ApprovalMode,
} from '@/lib/workflow-approval-mode';
import { useI18n } from '@/components/providers/i18n-provider';

interface WorkflowStep {
  id: number;
  step_order: number;
  step_name: string;
  approver_type: string;
  approver_id?: number | null;
  assignee_type?: 'specific_user' | 'department_manager' | 'position_in_department' | 'direct_manager' | null;
  assignee_user_id?: number | null;
  assignee_department_id?: number | null;
  assignee_position_id?: number | null;
  completion_mode?: 'any_one' | 'all' | 'min_n';
  min_required?: number | null;
  participant_role: 'approver' | 'signer';
}

interface WorkflowData {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  approval_mode?: ApprovalMode | null;
  steps: WorkflowStep[];
}

interface WorkflowFormData {
  name: string;
  description: string;
  approval_mode: ApprovalMode;
}

const DEFAULT_WORKFLOW_FORM_DATA: WorkflowFormData = {
  name: '',
  description: '',
  approval_mode: DEFAULT_APPROVAL_MODE,
};

interface StepFormData {
  step_name: string;
  assignee_type: 'specific_user' | 'department_manager' | 'position_in_department' | 'direct_manager';
  assignee_user_id: string;
  assignee_department_id: string;
  assignee_position_id: string;
  completion_mode: 'any_one' | 'all' | 'min_n';
  min_required: string;
  participant_role: 'approver' | 'signer';
}

const DEFAULT_STEP_FORM_DATA: StepFormData = {
  step_name: '',
  assignee_type: 'specific_user',
  assignee_user_id: '',
  assignee_department_id: '',
  assignee_position_id: '',
  completion_mode: 'all',
  min_required: '1',
  participant_role: 'approver',
};

export default function WorkflowsPage() {
  const { fetchJson, user, permissions } = useAuth();
  const { t } = useI18n();
  const canCreateWorkflows = user?.role === 'super_admin' || permissions.includes('workflows:create');
  const queryClient = useQueryClient();
  
  // Workflow dialog
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowData | null>(null);
  const [workflowFormData, setWorkflowFormData] = useState<WorkflowFormData>(DEFAULT_WORKFLOW_FORM_DATA);
  
  // Step management dialog
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [managingWorkflow, setManagingWorkflow] = useState<WorkflowData | null>(null);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepFormData, setStepFormData] = useState<StepFormData>(DEFAULT_STEP_FORM_DATA);

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
      return data.workflows.map((workflow) => ({
        ...workflow,
        approval_mode: normalizeApprovalMode(workflow.approval_mode),
      }));
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

  // Fetch positions for assignee selection
  const { data: positions } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const data = await fetchJson<any>('/positions');
      return (data?.positions || []).filter((position: any) => position.is_active);
    },
  });

  // Fetch departments for approver selection
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const data = await fetchJson<any>('/departments');
      return (data || []).filter((department: any) => department.is_active);
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
      setWorkflowFormData(DEFAULT_WORKFLOW_FORM_DATA);
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
        assignee_type: stepFormData.assignee_type,
        completion_mode: stepFormData.completion_mode,
        participant_role: stepFormData.participant_role,
      };

      if (stepFormData.completion_mode === 'min_n') {
        payload.min_required = parseInt(stepFormData.min_required || '1', 10);
      }

      if (stepFormData.assignee_type === 'specific_user' && stepFormData.assignee_user_id) {
        payload.assignee_user_id = parseInt(stepFormData.assignee_user_id, 10);
      } else if (stepFormData.assignee_type === 'department_manager' && stepFormData.assignee_department_id) {
        payload.assignee_department_id = parseInt(stepFormData.assignee_department_id, 10);
      } else if (stepFormData.assignee_type === 'position_in_department') {
        if (stepFormData.assignee_department_id) {
          payload.assignee_department_id = parseInt(stepFormData.assignee_department_id, 10);
        }
        if (stepFormData.assignee_position_id) {
          payload.assignee_position_id = parseInt(stepFormData.assignee_position_id, 10);
        }
      }

      return await fetchJson(`/workflows/${managingWorkflow.id}/steps`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (data) => {
      toast.success('Thêm bước thành công!');
      setIsStepDialogOpen(false);
      setStepFormData(DEFAULT_STEP_FORM_DATA);
      
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
    setWorkflowFormData(DEFAULT_WORKFLOW_FORM_DATA);
    setIsWorkflowDialogOpen(true);
  };

  const handleEditWorkflow = (workflow: WorkflowData) => {
    setEditingWorkflow(workflow);
    setWorkflowFormData({
      name: workflow.name,
      description: workflow.description || '',
      approval_mode: normalizeApprovalMode(workflow.approval_mode),
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

  const stopCardNavigation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleWorkflowCardKeyDown = (event: KeyboardEvent<HTMLElement>, workflow: WorkflowData) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    handleManageSteps(workflow);
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setStepFormData(DEFAULT_STEP_FORM_DATA);
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

  const getApproverIcon = (type?: string | null) => {
    switch (type) {
      case 'specific_user':
      case 'user': return <User className="w-4 h-4" />;
      case 'department_manager':
      case 'department': return <Building2 className="w-4 h-4" />;
      case 'position_in_department':
      case 'position': return <Briefcase className="w-4 h-4" />;
      case 'direct_manager':
      case 'manager': return <Users className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getApproverLabel = (type?: string | null) => {
    switch (type) {
      case 'user': return 'Người dùng';
      case 'department': return 'Phòng ban';
      case 'manager': return 'Quản lý';
      case 'position': return 'Chức danh';
      default: return type;
    }
  };

  const getAssignmentLabel = (type?: string | null) => {
    switch (type) {
      case 'specific_user':
        return 'Người dùng cụ thể';
      case 'department_manager':
        return 'Trưởng phòng ban';
      case 'position_in_department':
        return 'Chức danh trong phòng ban';
      case 'direct_manager':
        return 'Quản lý trực tiếp';
      default:
        return getApproverLabel(type);
    }
  };

  const getCompletionLabel = (mode?: string | null, minRequired?: number | null) => {
    switch (mode) {
      case 'any_one':
        return 'Một người bất kỳ';
      case 'min_n':
        return `Tối thiểu ${minRequired || 1} người`;
      default:
        return 'Tất cả';
    }
  };

  const getDefaultCompletionModeForAssignee = (type: StepFormData['assignee_type']) => {
    return type === 'position_in_department' ? 'any_one' : 'all';
  };

  const isStepFormValid = (() => {
    if (!stepFormData.step_name.trim()) return false;

    switch (stepFormData.assignee_type) {
      case 'specific_user':
        return !!stepFormData.assignee_user_id;
      case 'department_manager':
        return !!stepFormData.assignee_department_id;
      case 'position_in_department':
        if (!stepFormData.assignee_department_id || !stepFormData.assignee_position_id) return false;
        return stepFormData.completion_mode !== 'min_n' || Number(stepFormData.min_required) >= 1;
      case 'direct_manager':
        return stepFormData.completion_mode !== 'min_n' || Number(stepFormData.min_required) >= 1;
      default:
        return false;
    }
  })();

  const hasLegacyRoleSteps = !!managingWorkflow?.steps?.some(
    (step) => !step.assignee_type && step.approver_type === 'role',
  );

  // Filter workflows
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const totalItems = filteredWorkflows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedWorkflows = filteredWorkflows.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Workflow}
        title="Quản lý Quy trình Phê duyệt"
        description="Quản lý các quy trình phê duyệt văn bản"
        iconColor="text-blue-600"
        actions={canCreateWorkflows ? (
          <Button onClick={handleCreateWorkflow} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Tạo quy trình mới
          </Button>
        ) : undefined}
      />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search - Left */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm theo tên quy trình..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs - Right */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            className={statusFilter === 'all' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-gray-100'}
          >
            Tất cả
            <Badge variant="secondary" className="ml-2 bg-white text-gray-700">{counts.all}</Badge>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
            className={statusFilter === 'active' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-gray-100'}
          >
            Đang hoạt động
            <Badge variant="secondary" className="ml-2 bg-white text-gray-700">{counts.active}</Badge>
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'paused' ? 'default' : 'outline'}
            onClick={() => { setStatusFilter('paused'); setCurrentPage(1); }}
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
              action={!searchQuery && canCreateWorkflows ? {
                label: 'Tạo quy trình',
                onClick: handleCreateWorkflow,
              } : undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Workflow List */}
      {!isLoading && filteredWorkflows.length > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Quy trình
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Mô tả
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Số bước
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedWorkflows.map((workflow) => (
                    <tr
                      key={workflow.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      onClick={() => handleManageSteps(workflow)}
                      onKeyDown={(event) => handleWorkflowCardKeyDown(event, workflow)}
                      tabIndex={0}
                    >
                      <td className="px-6 py-4 align-top">
                        <p className="font-semibold text-gray-900">{workflow.name}</p>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-gray-600">
                        <p className="max-w-md line-clamp-2">
                          {workflow.description || 'Không có mô tả'}
                        </p>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-gray-700">
                        <span className="font-medium text-gray-900">{workflow.steps.length}</span> bước
                      </td>
                      <td className="px-6 py-4 align-top">
                        <Badge
                          variant={workflow.is_active ? 'default' : 'secondary'}
                          className={workflow.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}
                        >
                          <span className="mr-1">•</span>
                          {workflow.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 align-top" onClick={stopCardNavigation}>
                        <div className="flex items-center justify-end gap-1">
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
                          <Switch
                            checked={workflow.is_active}
                            onCheckedChange={() => handleToggleWorkflow(workflow.id, workflow.is_active)}
                            disabled={toggleWorkflowMutation.isPending}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-200 md:hidden">
              {paginatedWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="cursor-pointer space-y-4 p-4 transition-colors hover:bg-gray-50"
                  onClick={() => handleManageSteps(workflow)}
                  onKeyDown={(event) => handleWorkflowCardKeyDown(event, workflow)}
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className="truncate font-semibold text-gray-900">{workflow.name}</h3>
                    </div>
                    <Badge
                      variant={workflow.is_active ? 'default' : 'secondary'}
                      className={`shrink-0 ${workflow.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}
                    >
                      {workflow.is_active ? 'Đang bật' : 'Tạm dừng'}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600">
                    {workflow.description || 'Không có mô tả'}
                  </p>

                  <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
                    <span>
                      <span className="font-medium text-gray-900">{workflow.steps.length}</span> bước
                    </span>
                    <div className="flex items-center gap-1" onClick={stopCardNavigation}>
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
                      <Switch
                        checked={workflow.is_active}
                        onCheckedChange={() => handleToggleWorkflow(workflow.id, workflow.is_active)}
                        disabled={toggleWorkflowMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <div className="text-sm text-gray-600">
                Hiển thị {(safeCurrentPage - 1) * itemsPerPage + 1}-{Math.min(safeCurrentPage * itemsPerPage, totalItems)} / {totalItems} quy trình
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Mỗi trang</span>
                  <select
                    value={itemsPerPage}
                    onChange={(event) => { setItemsPerPage(Number(event.target.value)); setCurrentPage(1); }}
                    className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  >
                    {[10, 20, 30, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-1 sm:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safeCurrentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium text-gray-700">
                    {safeCurrentPage} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safeCurrentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Create/Edit Workflow Dialog */}
      <Dialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen}>
        <DialogContent className="max-w-2xl">
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
            <div className="space-y-2">
              <Label htmlFor="workflow-approval-mode">{t("workflow.approvalMode.label")}</Label>
              <Select
                value={workflowFormData.approval_mode}
                onValueChange={(value) =>
                  setWorkflowFormData({
                    ...workflowFormData,
                    approval_mode: normalizeApprovalMode(value),
                  })
                }
              >
                <SelectTrigger id="workflow-approval-mode" aria-label={t("workflow.approvalMode.label")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">{t(approvalModeTranslationKeys.sequential.label)}</SelectItem>
                  <SelectItem value="parallel">{t(approvalModeTranslationKeys.parallel.label)}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t(approvalModeTranslationKeys[workflowFormData.approval_mode].description)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkflowDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => saveWorkflowMutation.mutate()}
              disabled={!workflowFormData.name.trim() || saveWorkflowMutation.isPending}
            >
              {saveWorkflowMutation.isPending ? t("common.saving") : t("common.save")}
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
            {hasLegacyRoleSteps && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Quy trình này còn bước legacy dùng `Vai trò`. Bạn nên cấu hình lại bước đó bằng kiểu người xử lý mới để tránh mơ hồ khi chạy thực tế.
              </div>
            )}
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
                          {getApproverIcon(step.assignee_type || step.approver_type)}
                          <span>{getAssignmentLabel(step.assignee_type || step.approver_type)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getCompletionLabel(step.completion_mode, step.min_required)}
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
              <Label>Loại bước *</Label>
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
              <Label>Loại người xử lý *</Label>
              <select
                value={stepFormData.assignee_type}
                onChange={(e) => setStepFormData({ 
                  ...stepFormData, 
                  assignee_type: e.target.value as StepFormData['assignee_type'],
                  assignee_user_id: '',
                  assignee_department_id: '',
                  assignee_position_id: '',
                  completion_mode: getDefaultCompletionModeForAssignee(e.target.value as StepFormData['assignee_type']),
                  min_required: '1',
                })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="specific_user">Người dùng cụ thể</option>
                <option value="department_manager">Trưởng phòng ban</option>
                <option value="position_in_department">Chức danh trong phòng ban</option>
                <option value="direct_manager">Quản lý trực tiếp</option>
              </select>
            </div>

            {stepFormData.assignee_type === 'specific_user' && (
              <div className="space-y-2">
                <Label>Chọn người dùng *</Label>
                <select
                  value={stepFormData.assignee_user_id}
                  onChange={(e) => setStepFormData({ ...stepFormData, assignee_user_id: e.target.value })}
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

            {stepFormData.assignee_type === 'department_manager' && (
              <div className="space-y-2">
                <Label>Chọn phòng ban *</Label>
                <select
                  value={stepFormData.assignee_department_id}
                  onChange={(e) => setStepFormData({ ...stepFormData, assignee_department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">-- Chọn phòng ban --</option>
                  {departments?.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Hệ thống sẽ lấy trưởng phòng hiện tại của phòng ban này.
                </p>
              </div>
            )}

            {stepFormData.assignee_type === 'position_in_department' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Chọn phòng ban *</Label>
                  <select
                    value={stepFormData.assignee_department_id}
                    onChange={(e) => setStepFormData({ ...stepFormData, assignee_department_id: e.target.value })}
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
                <div className="space-y-2">
                  <Label>Chọn chức danh *</Label>
                  <select
                    value={stepFormData.assignee_position_id}
                    onChange={(e) => setStepFormData({ ...stepFormData, assignee_position_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">-- Chọn chức danh --</option>
                    {positions?.map((position: any) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {stepFormData.assignee_type === 'direct_manager' && (
              <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-md">
                Hệ thống sẽ lấy quản lý trực tiếp của người tạo tài liệu hoặc người gửi yêu cầu ký.
              </div>
            )}

            <div className="space-y-2">
              <Label>Cách hoàn thành *</Label>
              <select
                value={stepFormData.completion_mode}
                onChange={(e) => setStepFormData({
                  ...stepFormData,
                  completion_mode: e.target.value as StepFormData['completion_mode'],
                  min_required: e.target.value === 'min_n' ? stepFormData.min_required || '1' : '1',
                })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="any_one">Một người bất kỳ</option>
                <option value="all">Tất cả</option>
                <option value="min_n">Tối thiểu N người</option>
              </select>
            </div>

            {stepFormData.completion_mode === 'min_n' && (
              <div className="space-y-2">
                <Label>Số lượng tối thiểu *</Label>
                <Input
                  type="number"
                  min={1}
                  value={stepFormData.min_required}
                  onChange={(e) => setStepFormData({ ...stepFormData, min_required: e.target.value })}
                  placeholder="Nhập N"
                />
                <p className="text-xs text-muted-foreground">
                  Step sẽ hoàn tất khi có ít nhất số người này xử lý xong.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStepDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => addStepMutation.mutate()}
              disabled={!isStepFormValid || addStepMutation.isPending}
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

