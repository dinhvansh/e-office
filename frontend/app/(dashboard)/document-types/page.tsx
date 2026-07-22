'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, FileText, FileType, Plus, Settings, Trash2 } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { DashboardHeaderPortal as PageHeader } from '@/components/ui/dashboard-header-portal';
import { SelectWithIcon } from '@/components/ui/select-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { DocumentType, DocumentTypePolicy } from '@/lib/types';
import { useDestructiveConfirmation } from '@/components/providers/destructive-confirmation-provider';

type VisibilityScope =
  | 'private'
  | 'creator_only'
  | 'department'
  | 'department_and_manager'
  | 'workflow_only'
  | 'company'
  | 'custom_acl';

type AclSubjectType =
  | 'creator'
  | 'creator_department'
  | 'creator_manager'
  | 'specific_department'
  | 'specific_role'
  | 'specific_user'
  | 'workflow_participant'
  | 'cc_user'
  | 'legacy_position_in_department';

type AclPermission = 'VIEW' | 'DOWNLOAD' | 'EDIT' | 'COMMENT' | 'APPROVE' | 'SIGN' | 'SHARE' | 'DELETE';
type AclScope = 'OWN' | 'DEPARTMENT' | 'COMPANY' | 'ASSIGNED_ONLY' | 'ALL';

type AclTemplateForm = {
  subject_type: AclSubjectType;
  subject_id: string;
  scope_department_id: string;
  scope: AclScope;
  permissions: AclPermission[];
  status_limit: string[];
  is_active: boolean;
};

type AclTemplateEntry = AclTemplateForm & {
  id: string;
};

type AdvancedPolicyForm = {
  name: string;
  priority: string;
  effect: 'ALLOW' | 'DENY';
  condition_json: string;
  permission_json: string;
  is_active: boolean;
};

type AdvancedPolicyEntry = {
  id: string;
  name: string;
  priority: number;
  effect: 'ALLOW' | 'DENY';
  condition_json: Record<string, unknown>;
  permission_json: Record<string, unknown>;
  is_active: boolean;
};

const visibilityOptions: Array<{ value: VisibilityScope; label: string }> = [
  { value: 'private', label: 'Riêng tư' },
  { value: 'creator_only', label: 'Chỉ người tạo' },
  { value: 'department', label: 'Theo phòng ban' },
  { value: 'department_and_manager', label: 'Phòng ban và quản lý' },
  { value: 'workflow_only', label: 'Chỉ người trong workflow' },
  { value: 'company', label: 'Toàn công ty' },
  { value: 'custom_acl', label: 'Theo ACL tùy chỉnh' },
];

const aclSubjectOptions: Array<{ value: AclSubjectType; label: string }> = [
  { value: 'creator', label: 'Người tạo' },
  { value: 'creator_department', label: 'Phòng ban người tạo' },
  { value: 'creator_manager', label: 'Quản lý trực tiếp của người tạo' },
  { value: 'specific_department', label: 'Phòng ban cụ thể' },
  { value: 'specific_role', label: 'Vai trò cụ thể' },
  { value: 'specific_user', label: 'Người dùng cụ thể' },
  { value: 'workflow_participant', label: 'Người tham gia workflow' },
  { value: 'cc_user', label: 'Người nhận CC' },
];

const aclPermissionOptions: Array<{ value: AclPermission; label: string }> = [
  { value: 'VIEW', label: 'Xem' },
  { value: 'DOWNLOAD', label: 'Tải xuống' },
  { value: 'EDIT', label: 'Chỉnh sửa' },
  { value: 'COMMENT', label: 'Bình luận' },
  { value: 'APPROVE', label: 'Phê duyệt' },
  { value: 'SIGN', label: 'Ký' },
  { value: 'SHARE', label: 'Chia sẻ' },
  { value: 'DELETE', label: 'Xóa' },
];
const aclPermissionValues = new Set<AclPermission>(aclPermissionOptions.map((option) => option.value));

const aclScopeOptions: Array<{ value: AclScope; label: string }> = [
  { value: 'OWN', label: 'Của mình' },
  { value: 'DEPARTMENT', label: 'Phòng ban' },
  { value: 'COMPANY', label: 'Toàn công ty' },
  { value: 'ASSIGNED_ONLY', label: 'Chỉ đối tượng được gán' },
  { value: 'ALL', label: 'Toàn bộ' },
];

const statusLimitOptions = ['DRAFT', 'REJECTED', 'SUBMITTED', 'APPROVED', 'SIGNED'];

export default function DocumentTypesPage() {
  const { fetchJson } = useAuth();
  const confirmDestructive = useDestructiveConfirmation();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [showNumberingPattern, setShowNumberingPattern] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [defaultWorkflowId, setDefaultWorkflowId] = useState<number | null>(null);
  const [allowWorkflowOverride, setAllowWorkflowOverride] = useState(false);
  const [defaultVisibilityScope, setDefaultVisibilityScope] = useState<VisibilityScope>('department');
  const [autoAssignCreatorDepartment, setAutoAssignCreatorDepartment] = useState(true);
  const [forcePrivateOnCreate, setForcePrivateOnCreate] = useState(false);
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);
  const [aclTemplateForm, setAclTemplateForm] = useState<AclTemplateForm>({
    subject_type: 'specific_user',
    subject_id: '',
    scope_department_id: '',
    scope: 'ASSIGNED_ONLY',
    permissions: ['VIEW', 'DOWNLOAD'],
    status_limit: [],
    is_active: true,
  });
  const [aclTemplates, setAclTemplates] = useState<AclTemplateEntry[]>([]);
  const [editingAclTemplateId, setEditingAclTemplateId] = useState<string | null>(null);
  const [advancedPolicyForm, setAdvancedPolicyForm] = useState<AdvancedPolicyForm>({
    name: '',
    priority: '1',
    effect: 'ALLOW',
    condition_json: '{\n  "security_level": "CONFIDENTIAL"\n}',
    permission_json: '{\n  "permissions": ["VIEW"]\n}',
    is_active: true,
  });
  const [advancedPolicies, setAdvancedPolicies] = useState<AdvancedPolicyEntry[]>([]);
  const [editingAdvancedPolicyId, setEditingAdvancedPolicyId] = useState<string | null>(null);

  const resetAclTemplateForm = () => {
    setAclTemplateForm({
      subject_type: 'specific_user',
      subject_id: '',
      scope_department_id: '',
      scope: 'ASSIGNED_ONLY',
      permissions: ['VIEW', 'DOWNLOAD'],
      status_limit: [],
      is_active: true,
    });
    setEditingAclTemplateId(null);
  };

  const resetAdvancedPolicyForm = (nextPriority = '1') => {
    setAdvancedPolicyForm({
      name: '',
      priority: nextPriority,
      effect: 'ALLOW',
      condition_json: '{\n  "security_level": "CONFIDENTIAL"\n}',
      permission_json: '{\n  "permissions": ["VIEW"]\n}',
      is_active: true,
    });
    setEditingAdvancedPolicyId(null);
  };

  const handleOpenDialog = (type: DocumentType | null) => {
    setEditingType(type);
    setSelectedCategory(type?.category || '');
    setRequireApproval(type?.require_approval || false);
    setDefaultWorkflowId(type?.default_workflow_id || null);
    setAllowWorkflowOverride(type?.allow_workflow_override || false);
    setShowNumberingPattern(type?.require_numbering ?? true);
    setDefaultVisibilityScope('department');
    setAutoAssignCreatorDepartment(true);
    setForcePrivateOnCreate(false);
    setIsPolicyLoading(Boolean(type?.id));
    resetAclTemplateForm();
    setAclTemplates([]);
    resetAdvancedPolicyForm();
    setAdvancedPolicies([]);
    setShowCreateModal(true);
  };

  const { data: typesData, isLoading } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => fetchJson<DocumentType[]>('/document-types'),
  });

  const { data: workflowsData } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => fetchJson<any>('/workflows'),
  });

  const { data: usersData } = useQuery({
    queryKey: ['document-type-policy-users'],
    queryFn: () => fetchJson<any>('/users/active').catch(() => []),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['document-type-policy-departments'],
    queryFn: async () => {
      const data = await fetchJson<any>('/departments').catch(() => []);
      return Array.isArray(data) ? data : data?.departments || data?.data?.departments || data?.data || [];
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['document-type-policy-roles'],
    queryFn: async () => {
      const data = await fetchJson<any>('/roles').catch(() => []);
      return Array.isArray(data) ? data : data?.data || data || [];
    },
  });

  const { data: positionsData } = useQuery({
    queryKey: ['document-type-policy-positions'],
    queryFn: async () => {
      const data = await fetchJson<any>('/positions').catch(() => []);
      return data?.positions || data?.data?.positions || data?.data || data || [];
    },
  });

  useEffect(() => {
    if (!showCreateModal) return;

    if (!editingType?.id) return;

    let cancelled = false;

    fetchJson<DocumentTypePolicy>(`/settings/document-type-policy/${editingType.id}`)
      .then((policy) => {
        if (cancelled) return;
        setDefaultVisibilityScope(policy.visibility?.default_visibility_scope || 'department');
        setAutoAssignCreatorDepartment(policy.visibility?.auto_assign_creator_department ?? true);
        setForcePrivateOnCreate(Boolean(policy.visibility?.force_private_on_create));
        setAclTemplates(
          (policy.acl_templates || []).map((template, index) => ({
            id: template.id || `${editingType.id}-acl-${index}`,
            subject_type: template.subject_type,
            subject_id: template.subject_id ? String(template.subject_id) : '',
            scope_department_id: template.scope_department_id ? String(template.scope_department_id) : '',
            scope: template.scope || 'ASSIGNED_ONLY',
            permissions: (template.permissions || []).filter(
              (permission): permission is AclPermission => aclPermissionValues.has(permission as AclPermission),
            ),
            status_limit: template.status_limit || [],
            is_active: template.is_active !== false,
          }))
        );
        setAdvancedPolicies(policy.advanced_policies || []);
      })
      .catch(() => {
        if (cancelled) return;
        setDefaultVisibilityScope('department');
        setAutoAssignCreatorDepartment(true);
        setForcePrivateOnCreate(false);
        resetAclTemplateForm();
        setAclTemplates([]);
        resetAdvancedPolicyForm();
        setAdvancedPolicies([]);
      })
      .finally(() => {
        if (!cancelled) setIsPolicyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editingType?.id, fetchJson, showCreateModal]);

  const workflows = workflowsData?.workflows?.filter((workflow: any) => workflow.is_template) || [];
  const types: DocumentType[] = typesData || [];
  const permissionUsers = Array.isArray(usersData) ? usersData : [];
  const permissionDepartments = Array.isArray(departmentsData) ? departmentsData : [];
  const permissionRoles = Array.isArray(rolesData) ? rolesData : [];
  const permissionPositions = (Array.isArray(positionsData) ? positionsData : []).filter((position: any) => position.is_active !== false);
  const typesWithCount = types.map((type) => ({
    ...type,
    _count: type._count || { documents: 0 },
    numbering_rules: type.numbering_rules || [],
  }));

  const getAclSubjectLabel = (subjectType: AclSubjectType) => {
    return aclSubjectOptions.find((option) => option.value === subjectType)?.label || subjectType;
  };

  const getAclTemplateLabel = (permission: AclTemplateEntry) => {
    if (permission.subject_type === 'specific_user') {
      const match = permissionUsers.find((user: any) => user.id === Number(permission.subject_id));
      return match?.full_name || match?.email || `User #${permission.subject_id}`;
    }

    if (permission.subject_type === 'specific_department') {
      const match = permissionDepartments.find((department: any) => department.id === Number(permission.subject_id));
      return match?.name || `Phòng ban #${permission.subject_id}`;
    }

    if (permission.subject_type === 'specific_role') {
      const match = permissionRoles.find((role: any) => role.id === Number(permission.subject_id));
      return match?.name || `Vai trò #${permission.subject_id}`;
    }

    if (permission.subject_type === 'legacy_position_in_department') {
      const position = permissionPositions.find((item: any) => item.id === Number(permission.subject_id));
      const department = permissionDepartments.find((item: any) => item.id === Number(permission.scope_department_id));
      return `${position?.name || `Chức danh #${permission.subject_id}`} / ${department?.name || `Phòng ban #${permission.scope_department_id}`}`;
    }

    if (permission.subject_type === 'creator') return 'Người tạo tài liệu';
    if (permission.subject_type === 'creator_department') return 'Phòng ban của người tạo';
    if (permission.subject_type === 'creator_manager') return 'Quản lý trực tiếp của người tạo';
    if (permission.subject_type === 'workflow_participant') return 'Người tham gia workflow';
    if (permission.subject_type === 'cc_user') return 'Người nhận CC';

    return permission.subject_type;
  };

  const buildPolicyPayload = useMemo(
    () => ({
      visibility: {
        default_visibility_scope: forcePrivateOnCreate ? 'private' : defaultVisibilityScope,
        default_security_level: 'normal',
        auto_assign_creator_department: autoAssignCreatorDepartment,
        force_private_on_create: forcePrivateOnCreate,
      },
      acl_templates: aclTemplates.map((template) => ({
        id: template.id,
        subject_type: template.subject_type,
        subject_id: template.subject_id ? Number(template.subject_id) : null,
        scope_department_id: template.scope_department_id ? Number(template.scope_department_id) : null,
        scope: template.scope,
        permissions: template.permissions,
        status_limit: template.status_limit.length ? template.status_limit : null,
        is_active: template.is_active,
      })),
      advanced_policies: advancedPolicies,
    }),
    [
      aclTemplates,
      advancedPolicies,
      autoAssignCreatorDepartment,
      defaultVisibilityScope,
      forcePrivateOnCreate,
    ]
  );

  const handleAddAclTemplate = () => {
    const requiresSubjectId = ['specific_user', 'specific_department', 'specific_role', 'legacy_position_in_department'].includes(
      aclTemplateForm.subject_type
    );
    const requiresScopeDepartment = aclTemplateForm.subject_type === 'legacy_position_in_department';
    const hasPermissions = aclTemplateForm.permissions.length > 0;

    if (requiresSubjectId && !aclTemplateForm.subject_id) {
      toast.error('Vui lòng chọn đối tượng áp dụng');
      return;
    }

    if (requiresScopeDepartment && !aclTemplateForm.scope_department_id) {
      toast.error('Vui lòng chọn phòng ban phạm vi');
      return;
    }

    if (!hasPermissions) {
      toast.error('Vui lòng chọn ít nhất một quyền');
      return;
    }

    if (
      aclTemplateForm.permissions.includes('DELETE') &&
      (aclTemplateForm.subject_type === 'specific_department' || aclTemplateForm.scope === 'COMPANY')
    ) {
      toast.error('Không được cấp quyền Xóa rộng cho phòng ban hoặc toàn công ty');
      return;
    }

    if (
      aclTemplateForm.subject_type === 'creator' &&
      ['EDIT', 'DELETE'].some((item) => aclTemplateForm.permissions.includes(item as AclPermission)) &&
      aclTemplateForm.status_limit.some((item) => !['DRAFT', 'REJECTED'].includes(item))
    ) {
      toast.error('Người tạo chỉ được Sửa/Xóa ở DRAFT hoặc REJECTED');
      return;
    }

    if (aclTemplateForm.subject_type === 'workflow_participant' && !aclTemplateForm.permissions.includes('VIEW')) {
      toast.error('Người trong workflow phải có tối thiểu quyền Xem');
      return;
    }

    setAclTemplates((current) => [
      ...current,
      {
        ...aclTemplateForm,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    ]);

    setAclTemplateForm({
      subject_type: 'specific_user',
      subject_id: '',
      scope_department_id: '',
      scope: 'ASSIGNED_ONLY',
      permissions: ['VIEW', 'DOWNLOAD'],
      status_limit: [],
      is_active: true,
    });
  };

  const handleAddAdvancedPolicy = () => {
    try {
      const conditionJson = JSON.parse(advancedPolicyForm.condition_json || '{}');
      const permissionJson = JSON.parse(advancedPolicyForm.permission_json || '{}');
      setAdvancedPolicies((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: advancedPolicyForm.name.trim() || `Policy ${current.length + 1}`,
          priority: Number(advancedPolicyForm.priority) || current.length + 1,
          effect: advancedPolicyForm.effect,
          condition_json: conditionJson,
          permission_json: permissionJson,
          is_active: advancedPolicyForm.is_active,
        },
      ]);
      setAdvancedPolicyForm({
        name: '',
        priority: String((advancedPolicies.length || 0) + 1),
        effect: 'ALLOW',
        condition_json: '{\n  "security_level": "CONFIDENTIAL"\n}',
        permission_json: '{\n  "permissions": ["VIEW"]\n}',
        is_active: true,
      });
    } catch {
      toast.error('condition_json hoặc permission_json không đúng định dạng JSON');
    }
  };

  const submitAclTemplate = () => {
    const requiresSubjectId = ['specific_user', 'specific_department', 'specific_role', 'legacy_position_in_department'].includes(
      aclTemplateForm.subject_type
    );
    const requiresScopeDepartment = aclTemplateForm.subject_type === 'legacy_position_in_department';
    const hasPermissions = aclTemplateForm.permissions.length > 0;

    if (requiresSubjectId && !aclTemplateForm.subject_id) {
      toast.error('Vui lòng chọn đối tượng áp dụng');
      return;
    }

    if (requiresScopeDepartment && !aclTemplateForm.scope_department_id) {
      toast.error('Vui lòng chọn phòng ban phạm vi');
      return;
    }

    if (!hasPermissions) {
      toast.error('Vui lòng chọn ít nhất một quyền');
      return;
    }

    if (
      aclTemplateForm.permissions.includes('DELETE') &&
      (aclTemplateForm.subject_type === 'specific_department' || aclTemplateForm.scope === 'COMPANY')
    ) {
      toast.error('Không được cấp quyền Xóa rộng cho phòng ban hoặc toàn công ty');
      return;
    }

    if (
      aclTemplateForm.subject_type === 'creator' &&
      ['EDIT', 'DELETE'].some((item) => aclTemplateForm.permissions.includes(item as AclPermission)) &&
      aclTemplateForm.status_limit.some((item) => !['DRAFT', 'REJECTED'].includes(item))
    ) {
      toast.error('Người tạo chỉ được Sửa/Xóa ở DRAFT hoặc REJECTED');
      return;
    }

    if (aclTemplateForm.subject_type === 'workflow_participant' && !aclTemplateForm.permissions.includes('VIEW')) {
      toast.error('Người trong workflow phải có tối thiểu quyền Xem');
      return;
    }

    const nextEntry: AclTemplateEntry = {
      ...aclTemplateForm,
      id: editingAclTemplateId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    setAclTemplates((current) =>
      editingAclTemplateId ? current.map((item) => (item.id === editingAclTemplateId ? nextEntry : item)) : [...current, nextEntry]
    );

    resetAclTemplateForm();
  };

  const submitAdvancedPolicy = () => {
    try {
      const conditionJson = JSON.parse(advancedPolicyForm.condition_json || '{}');
      const permissionJson = JSON.parse(advancedPolicyForm.permission_json || '{}');
      const nextEntry: AdvancedPolicyEntry = {
        id: editingAdvancedPolicyId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: advancedPolicyForm.name.trim() || `Policy ${advancedPolicies.length + 1}`,
        priority: Number(advancedPolicyForm.priority) || advancedPolicies.length + 1,
        effect: advancedPolicyForm.effect,
        condition_json: conditionJson,
        permission_json: permissionJson,
        is_active: advancedPolicyForm.is_active,
      };

      setAdvancedPolicies((current) =>
        editingAdvancedPolicyId ? current.map((item) => (item.id === editingAdvancedPolicyId ? nextEntry : item)) : [...current, nextEntry]
      );
      resetAdvancedPolicyForm(String((advancedPolicies.length || 0) + (editingAdvancedPolicyId ? 0 : 1)));
    } catch {
      toast.error('condition_json hoặc permission_json không đúng định dạng JSON');
    }
  };

  const handleEditAclTemplate = (template: AclTemplateEntry) => {
    setAclTemplateForm({
      subject_type: template.subject_type,
      subject_id: template.subject_id,
      scope_department_id: template.scope_department_id,
      scope: template.scope,
      permissions: template.permissions,
      status_limit: template.status_limit,
      is_active: template.is_active,
    });
    setEditingAclTemplateId(template.id);
  };

  const handleEditAdvancedPolicy = (policy: AdvancedPolicyEntry) => {
    setAdvancedPolicyForm({
      name: policy.name,
      priority: String(policy.priority),
      effect: policy.effect,
      condition_json: JSON.stringify(policy.condition_json, null, 2),
      permission_json: JSON.stringify(policy.permission_json, null, 2),
      is_active: policy.is_active,
    });
    setEditingAdvancedPolicyId(policy.id);
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<DocumentType>) => {
      const documentType = await fetchJson<DocumentType>('/document-types', { method: 'POST', body: JSON.stringify(data) });
      await fetchJson(`/settings/document-type-policy/${documentType.id}`, {
        method: 'POST',
        body: JSON.stringify(buildPolicyPayload),
      });
      return documentType;
    },
    onSuccess: () => {
      toast.success(editingType ? 'Cập nhật loại văn bản thành công' : 'Tạo loại văn bản thành công');
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      setShowCreateModal(false);
      setEditingType(null);
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DocumentType> & { id: number }) => {
      const documentType = await fetchJson<DocumentType>(`/document-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await fetchJson(`/settings/document-type-policy/${id}`, {
        method: 'POST',
        body: JSON.stringify(buildPolicyPayload),
      });
      return documentType;
    },
    onSuccess: () => {
      toast.success('Cập nhật loại văn bản thành công');
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      setShowCreateModal(false);
      setEditingType(null);
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra'}`);
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (typeId: number) => fetchJson(`/document-types/${typeId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Xóa loại văn bản thành công');
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra'}`);
    },
  });

  const categoryColors: Record<string, string> = {
    incoming: 'bg-blue-100 text-blue-700',
    outgoing: 'bg-green-100 text-green-700',
    internal: 'bg-purple-100 text-purple-700',
    contract: 'bg-orange-100 text-orange-700',
  };

  const categoryLabels: Record<string, string> = {
    incoming: 'Văn bản đến',
    outgoing: 'Văn bản đi',
    internal: 'Nội bộ',
    contract: 'Hợp đồng',
  };

  const categoryOptions = [
    { value: 'incoming', label: 'Văn bản đến', icon: '📥' },
    { value: 'outgoing', label: 'Văn bản đi', icon: '📤' },
    { value: 'internal', label: 'Nội bộ', icon: '🏢' },
    { value: 'contract', label: 'Hợp đồng', icon: '📋' },
  ];

  const handleDelete = (type: (typeof typesWithCount)[number]) => {
    if (type._count.documents > 0) {
      toast.error('Không thể xóa loại văn bản đang được sử dụng');
      return;
    }

    confirmDestructive({
      title: 'Xóa loại văn bản',
      targetName: type.name,
      description: 'Loại văn bản này sẽ bị xóa và không thể khôi phục từ màn hình này.',
      confirmLabel: 'Xóa loại văn bản',
      errorMessage: 'Không thể xóa loại văn bản. Vui lòng thử lại.',
    }, () => deleteTypeMutation.mutateAsync(type.id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileType}
        title="Loại văn bản"
        description="Quản lý phân loại và đánh số văn bản"
        iconColor="text-orange-600"
        actions={
          <Button onClick={() => handleOpenDialog(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm loại văn bản
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : types.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileType}
              title="Chưa có loại văn bản"
              description="Tạo loại văn bản đầu tiên để phân loại và quản lý tài liệu"
              action={{ label: 'Thêm loại văn bản', onClick: () => handleOpenDialog(null) }}
            />
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,2.2fr)_140px_minmax(0,1.5fr)_120px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:grid">
              <div>Loại văn bản</div>
              <div>Danh mục</div>
              <div>Cấu hình</div>
              <div>Số lượng</div>
              <div className="text-right">Thao tác</div>
            </div>

            <div className="divide-y divide-slate-200">
              {typesWithCount.map((type) => (
                <div
                  key={type.id}
                  className="grid gap-4 px-5 py-4 transition-colors hover:bg-slate-50 md:grid-cols-[minmax(0,2.2fr)_140px_minmax(0,1.5fr)_120px_120px] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-slate-900">{type.name}</h3>
                          {!type.is_active && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{type.code}</p>
                        {type.description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{type.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {type.category && (
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${
                          categoryColors[type.category] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {categoryLabels[type.category] || type.category}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      {type.require_numbering && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                          <Settings className="h-3 w-3" />
                          Đánh số
                        </span>
                      )}
                      {type.require_digital_signing && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                          {'\u270D\uFE0F G\u1EEDi ngo\u00E0i k\u00FD \u0111i\u1EC7n t\u1EED'}
                        </span>
                      )}
                      {type.require_approval && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                          ✅ Phê duyệt
                        </span>
                      )}
                    </div>

                    {type.numbering_rules[0] && (
                      <p className="text-xs leading-5 text-slate-500">
                        Pattern: {type.numbering_rules[0].pattern}
                        <br />
                        Số cuối: {type.numbering_rules[0].last_number}
                      </p>
                    )}
                  </div>

                  <div className="text-sm font-medium text-slate-700">{type._count.documents} văn bản</div>

                  <div className="flex items-center justify-start gap-2 md:justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleOpenDialog(type)}
                      title="Chỉnh sửa"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(type)}
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setEditingType(null);
        }}
      >
        <DialogContent className="max-h-[92vh] sm:max-w-4xl">
          <DialogHeader className="border-b border-slate-200 pb-4 pr-12">
            <DialogTitle>{editingType ? 'Chỉnh sửa loại văn bản' : 'Thêm loại văn bản mới'}</DialogTitle>
            <DialogDescription>
              {editingType ? 'Cập nhật thông tin loại văn bản' : 'Tạo loại văn bản để phân loại và quản lý tài liệu'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const requireNumbering = formData.get('require_numbering') === 'on';
              const data = {
                code: formData.get('code') as string,
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                category: formData.get('category') as string,
                require_numbering: requireNumbering,
                require_digital_signing: formData.get('require_digital_signing') === 'on',
                numbering_pattern: requireNumbering ? (formData.get('numbering_pattern') as string) : null,
                require_approval: requireApproval,
                default_workflow_id: defaultWorkflowId,
                allow_workflow_override: allowWorkflowOverride,
              };

              if (editingType) {
                updateMutation.mutate({ id: editingType.id, ...data });
                return;
              }

              createMutation.mutate(data);
            }}
            className="space-y-6 overflow-y-auto pr-1"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Mã *</label>
                <input
                  name="code"
                  required
                  defaultValue={editingType?.code}
                  placeholder="VD: CV, HD, QD"
                  className="block h-14 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tên *</label>
                <input
                  name="name"
                  required
                  defaultValue={editingType?.name}
                  placeholder="VD: Công văn, Hợp đồng"
                  className="block h-14 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[1.3fr_0.9fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Mô tả</label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={editingType?.description || ''}
                  placeholder="Mô tả chi tiết về loại văn bản..."
                  className="block w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Danh mục</label>
                <input type="hidden" name="category" value={selectedCategory} />
                <SelectWithIcon
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={(value) => setSelectedCategory(String(value))}
                  placeholder="Chọn danh mục"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="require_numbering"
                  defaultChecked={editingType?.require_numbering ?? true}
                  onChange={(event) => setShowNumberingPattern(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-sm font-semibold text-slate-800">🔢 Yêu cầu đánh số tự động</span>
              </label>

              {showNumberingPattern && (
                <div className="ml-7 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cấu hình đánh số
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['+ Số tự động', '{AUTO}', 'bg-blue-50 text-blue-700'],
                      ['+ Năm', '{YEAR}', 'bg-green-50 text-green-700'],
                      ['+ Tháng', '{MONTH}', 'bg-purple-50 text-purple-700'],
                      ['+ Mã loại', '{TYPE}', 'bg-orange-50 text-orange-700'],
                      ['+ Dấu /', '/', 'bg-slate-100 text-slate-700'],
                      ['+ Dấu -', '-', 'bg-slate-100 text-slate-700'],
                    ].map(([label, token, className]) => (
                      <button
                        key={String(token)}
                        type="button"
                        onClick={() => {
                          const input = document.querySelector('[name="numbering_pattern"]') as HTMLInputElement | null;
                          if (input) input.value = `${input.value || ''}${token}`;
                        }}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:brightness-95 ${className}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    name="numbering_pattern"
                    defaultValue={editingType?.numbering_rules?.[0]?.pattern || '{AUTO}/{YEAR}'}
                    placeholder="VD: {AUTO}/{YEAR}"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />

                  <div className="space-y-1 text-xs text-slate-500">
                    <p className="font-medium">Ví dụ kết quả:</p>
                    <p className="rounded bg-slate-50 px-2 py-1 font-mono">001/2025 hoặc CV-001/11/2025</p>
                  </div>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="require_digital_signing"
                  defaultChecked={editingType?.require_digital_signing ?? false}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-sm font-semibold text-slate-800">
                  {'\u270D\uFE0F Cho ph\u00E9p g\u1EEDi ra b\u00EAn ngo\u00E0i \u0111\u1EC3 k\u00FD \u0111i\u1EC7n t\u1EED'}
                </span>
              </label>
            </div>

            <div className="space-y-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="require_approval"
                  checked={requireApproval}
                  onChange={(event) => {
                    setRequireApproval(event.target.checked);
                    if (!event.target.checked) {
                      setDefaultWorkflowId(null);
                      setAllowWorkflowOverride(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-sm font-semibold text-slate-800">✅ Yêu cầu phê duyệt</span>
              </label>

              {requireApproval && (
                <div className="ml-7 space-y-4 rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Luồng phê duyệt mặc định
                    </label>
                    <p className="mb-3 text-sm leading-6 text-slate-500">
                      Màn này chỉ dùng để gán workflow template mặc định cho loại văn bản.
                      Việc tạo hoặc chỉnh sửa workflow được thực hiện ở màn <span className="font-medium text-slate-700">Quy trình phê duyệt</span>.
                    </p>
                    <input type="hidden" name="default_workflow_id" value={defaultWorkflowId || ''} />
                    <select
                      value={defaultWorkflowId || ''}
                      onChange={(event) => {
                        const value = event.target.value ? parseInt(event.target.value, 10) : null;
                        setDefaultWorkflowId(value);
                        if (!value) setAllowWorkflowOverride(false);
                      }}
                      className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Không gán mặc định (người dùng tự chọn/tự tạo khi lập hồ sơ) --</option>
                      {workflows.map((workflow: any) => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name} ({workflow.steps?.length || 0} bước)
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      💡 Để trống nếu loại văn bản này không khóa một luồng cố định, và người dùng sẽ tự chọn hoặc tự tạo luồng khi tạo trình ký.
                    </p>
                  </div>

                  {defaultWorkflowId && (
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        name="allow_workflow_override"
                        checked={allowWorkflowOverride}
                        onChange={(event) => setAllowWorkflowOverride(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <span className="text-sm font-medium text-slate-700">🔧 Cho phép tùy chỉnh lại luồng mặc định khi tạo trình ký</span>
                    </label>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold">Chế độ: </span>
                    {!defaultWorkflowId ? (
                      <span className="font-medium text-purple-600">Không gán mặc định: người dùng tự chọn hoặc tự tạo workflow lúc lập hồ sơ</span>
                    ) : !allowWorkflowOverride ? (
                      <span className="font-medium text-orange-600">Cố định: bắt buộc dùng đúng workflow mặc định đã gán cho loại văn bản này</span>
                    ) : (
                      <span className="font-medium text-green-600">Linh hoạt: khởi tạo từ workflow mặc định nhưng người dùng được phép chỉnh lại khi tạo trình ký</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Thiết lập hiển thị & bảo mật mặc định</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Cấu hình này quyết định document mới tạo thuộc phạm vi nào và có mức bảo mật nào. Đây chưa phải là quyền thao tác chi tiết.
                </p>
              </div>

              {isPolicyLoading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Đang tải policy của loại tài liệu...
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Phạm vi truy cập mặc định</label>
                    <select
                      value={forcePrivateOnCreate ? 'private' : defaultVisibilityScope}
                      disabled={forcePrivateOnCreate}
                      onChange={(event) => setDefaultVisibilityScope(event.target.value as VisibilityScope)}
                      className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-100 disabled:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      {visibilityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {forcePrivateOnCreate && (
                      <p className="text-xs text-amber-700">
                        Đang ghi đè về Riêng tư vì đã bật “Luôn để riêng tư khi mới tạo”.
                      </p>
                    )}
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={autoAssignCreatorDepartment}
                      onChange={(event) => setAutoAssignCreatorDepartment(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Tự động gán phòng ban người tạo vào document
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={forcePrivateOnCreate}
                      onChange={(event) => setForcePrivateOnCreate(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-sm font-medium text-slate-700">Luôn để riêng tư khi mới tạo</span>
                  </label>
                </div>
              )}
            </div>

            {false && (
            <div className="space-y-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Quyền thao tác mặc định</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Các quyền bên dưới sẽ được tự động gán cho document khi tạo từ loại văn bản này.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Đối tượng</label>
                  <select
                    value={aclTemplateForm.subject_type}
                    onChange={(event) =>
                      setAclTemplateForm((current) => ({
                        ...current,
                        subject_type: event.target.value as AclSubjectType,
                        subject_id: '',
                        scope_department_id: '',
                      }))
                    }
                    className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {aclSubjectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Phạm vi</label>
                  <select
                    value={aclTemplateForm.scope}
                    onChange={(event) =>
                      setAclTemplateForm((current) => ({
                        ...current,
                        scope: event.target.value as AclScope,
                      }))
                    }
                    className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {aclScopeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Giới hạn trạng thái</label>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3">
                    {statusLimitOptions.map((status) => (
                      <label key={status} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={aclTemplateForm.status_limit.includes(status)}
                          onChange={(event) =>
                            setAclTemplateForm((current) => ({
                              ...current,
                              status_limit: event.target.checked
                                ? [...current.status_limit, status]
                                : current.status_limit.filter((item) => item !== status),
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        <span>{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {aclTemplateForm.subject_type === 'specific_user' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Người dùng cụ thể</label>
                  <select
                    value={aclTemplateForm.subject_id}
                    onChange={(event) => setAclTemplateForm((current) => ({ ...current, subject_id: event.target.value }))}
                    className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Chọn người dùng --</option>
                    {permissionUsers.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {aclTemplateForm.subject_type === 'specific_department' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Phòng ban cụ thể</label>
                  <select
                    value={aclTemplateForm.subject_id}
                    onChange={(event) => setAclTemplateForm((current) => ({ ...current, subject_id: event.target.value }))}
                    className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {permissionDepartments.map((department: any) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {aclTemplateForm.subject_type === 'specific_role' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Vai trò cụ thể</label>
                  <select
                    value={aclTemplateForm.subject_id}
                    onChange={(event) => setAclTemplateForm((current) => ({ ...current, subject_id: event.target.value }))}
                    className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Chọn vai trò --</option>
                    {permissionRoles.map((role: any) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Quyền</label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {aclPermissionOptions.map((permission) => (
                    <label key={permission.value} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={aclTemplateForm.permissions.includes(permission.value)}
                        onChange={(event) =>
                          setAclTemplateForm((current) => ({
                            ...current,
                            permissions: event.target.checked
                              ? Array.from(new Set([...current.permissions, permission.value]))
                              : current.permissions.filter((item) => item !== permission.value),
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {editingAclTemplateId && (
                  <Button type="button" variant="ghost" onClick={resetAclTemplateForm}>
                    Hủy sửa
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={submitAclTemplate}>
                  Thêm quyền thao tác mặc định
                </Button>
              </div>

              {aclTemplates.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="grid grid-cols-[160px_minmax(0,1.3fr)_120px_minmax(0,1.3fr)_160px_80px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <div>Đối tượng</div>
                    <div>Giá trị đối tượng</div>
                    <div>Phạm vi</div>
                    <div>Quyền</div>
                    <div>Giới hạn trạng thái</div>
                    <div>Thao tác</div>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {aclTemplates.map((template) => (
                      <div key={template.id} className="grid grid-cols-[160px_minmax(0,1.3fr)_120px_minmax(0,1.3fr)_160px_80px] gap-3 px-4 py-3 text-sm">
                        <div>{getAclSubjectLabel(template.subject_type)}</div>
                        <div>{getAclTemplateLabel(template)}</div>
                        <div>{template.scope}</div>
                        <div className="flex flex-wrap gap-1">
                          {template.permissions.map((permission) => (
                            <span key={permission} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs">
                              {permission}
                            </span>
                          ))}
                        </div>
                        <div>{template.status_limit.length ? template.status_limit.join(', ') : 'Không giới hạn'}</div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditAclTemplate(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setAclTemplates((current) => current.filter((item) => item.id !== template.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}

            {false && (
            <>
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Quyền tài liệu</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Quyền theo người dùng, phòng ban và chức danh không còn cấu hình tại màn này. Hãy dùng tab <strong>Quyền tài liệu</strong> trong menu <strong>Vai trò &amp; Quyền</strong> để thiết lập quyền theo loại văn bản.
                </p>
              </div>
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
                Màn <strong>Loại văn bản</strong> hiện chỉ dùng để định nghĩa tính chất nền của loại tài liệu như workflow mặc định, phạm vi truy cập mặc định, mức bảo mật mặc định, đánh số và các tùy chọn nghiệp vụ khác.
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Quyền nâng cao</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Dùng cho các điều kiện đặc biệt như tài liệu mật, số tiền lớn, phòng ban đặc biệt hoặc trạng thái đặc biệt.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Tên rule</label>
                  <input
                    value={advancedPolicyForm.name}
                    onChange={(event) => setAdvancedPolicyForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ví dụ: Chặn xem hồ sơ mật"
                    className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Priority</label>
                  <input
                    type="number"
                    value={advancedPolicyForm.priority}
                    onChange={(event) => setAdvancedPolicyForm((current) => ({ ...current, priority: event.target.value }))}
                    className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Effect</label>
                  <select
                    value={advancedPolicyForm.effect}
                    onChange={(event) => setAdvancedPolicyForm((current) => ({ ...current, effect: event.target.value as 'ALLOW' | 'DENY' }))}
                    className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">condition_json</label>
                  <textarea
                    rows={6}
                    value={advancedPolicyForm.condition_json}
                    onChange={(event) => setAdvancedPolicyForm((current) => ({ ...current, condition_json: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">permission_json</label>
                  <textarea
                    rows={6}
                    value={advancedPolicyForm.permission_json}
                    onChange={(event) => setAdvancedPolicyForm((current) => ({ ...current, permission_json: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={advancedPolicyForm.is_active}
                  onChange={(event) => setAdvancedPolicyForm((current) => ({ ...current, is_active: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Bật rule
              </label>

              <div className="flex justify-end gap-2">
                {editingAdvancedPolicyId && (
                  <Button type="button" variant="ghost" onClick={() => resetAdvancedPolicyForm(String(advancedPolicies.length || 1))}>
                    Hủy sửa
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={submitAdvancedPolicy}>
                  Thêm policy nâng cao
                </Button>
              </div>

              {advancedPolicies.length > 0 && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                  {advancedPolicies
                    .slice()
                    .sort((a, b) => a.priority - b.priority)
                    .map((policy) => (
                      <div key={policy.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-slate-800">
                            {policy.name} <span className="text-xs font-normal text-slate-500">({policy.effect} / priority {policy.priority})</span>
                          </div>
                          <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-600">{JSON.stringify(policy.condition_json, null, 2)}</pre>
                          <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-600">{JSON.stringify(policy.permission_json, null, 2)}</pre>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditAdvancedPolicy(policy)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setAdvancedPolicies((current) => current.filter((item) => item.id !== policy.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            </>
            )}

            <DialogFooter className="sticky bottom-0 bg-background/95 pb-1 backdrop-blur">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingType(null);
                }}
              >
                Hủy
              </Button>
              <Button className="min-w-36" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingType
                  ? updateMutation.isPending
                    ? 'Đang cập nhật...'
                    : 'Cập nhật'
                  : createMutation.isPending
                    ? 'Đang tạo...'
                    : 'Tạo mới'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
