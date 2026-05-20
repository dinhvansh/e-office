'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, FileText, FileType, Plus, Settings, Trash2 } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SelectWithIcon } from '@/components/ui/select-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { DocumentType, DocumentTypePolicy } from '@/lib/types';

export default function DocumentTypesPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [showNumberingPattern, setShowNumberingPattern] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [defaultWorkflowId, setDefaultWorkflowId] = useState<number | null>(null);
  const [allowWorkflowOverride, setAllowWorkflowOverride] = useState(false);
  const [defaultVisibilityScope, setDefaultVisibilityScope] = useState<'public' | 'department' | 'private'>('department');
  const [defaultConfidentialLevel, setDefaultConfidentialLevel] = useState<'normal' | 'confidential' | 'secret' | 'top_secret'>('normal');
  const [inheritCreatorDepartment, setInheritCreatorDepartment] = useState(true);
  const [forcePrivateUntilCompleted, setForcePrivateUntilCompleted] = useState(false);
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);

  const handleOpenDialog = (type: DocumentType | null) => {
    setEditingType(type);
    setSelectedCategory(type?.category || '');
    setRequireApproval(type?.require_approval || false);
    setDefaultWorkflowId(type?.default_workflow_id || null);
    setAllowWorkflowOverride(type?.allow_workflow_override || false);
    setShowNumberingPattern(type?.require_numbering ?? true);
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

  useEffect(() => {
    if (!showCreateModal) return;

    if (!editingType?.id) {
      setDefaultVisibilityScope('department');
      setDefaultConfidentialLevel('normal');
      setInheritCreatorDepartment(true);
      setForcePrivateUntilCompleted(false);
      setIsPolicyLoading(false);
      return;
    }

    let cancelled = false;
    setIsPolicyLoading(true);

    fetchJson<DocumentTypePolicy>(`/settings/document-type-policy/${editingType.id}`)
      .then((policy) => {
        if (cancelled) return;
        setDefaultVisibilityScope(policy?.default_visibility_scope || 'department');
        setDefaultConfidentialLevel(policy?.default_confidential_level || 'normal');
        setInheritCreatorDepartment(policy?.inherit_creator_department ?? true);
        setForcePrivateUntilCompleted(Boolean(policy?.force_private_until_completed));
      })
      .catch(() => {
        if (cancelled) return;
        setDefaultVisibilityScope('department');
        setDefaultConfidentialLevel('normal');
        setInheritCreatorDepartment(true);
        setForcePrivateUntilCompleted(false);
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
  const typesWithCount = types.map((type) => ({
    ...type,
    _count: type._count || { documents: 0 },
    numbering_rules: type.numbering_rules || [],
  }));

  const createMutation = useMutation({
    mutationFn: async (data: Partial<DocumentType>) => {
      const documentType = await fetchJson<DocumentType>('/document-types', { method: 'POST', body: JSON.stringify(data) });
      await fetchJson(`/settings/document-type-policy/${documentType.id}`, {
        method: 'POST',
        body: JSON.stringify({
          default_visibility_scope: defaultVisibilityScope,
          default_confidential_level: defaultConfidentialLevel,
          inherit_creator_department: inheritCreatorDepartment,
          force_private_until_completed: forcePrivateUntilCompleted,
        }),
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
        body: JSON.stringify({
          default_visibility_scope: defaultVisibilityScope,
          default_confidential_level: defaultConfidentialLevel,
          inherit_creator_department: inheritCreatorDepartment,
          force_private_until_completed: forcePrivateUntilCompleted,
        }),
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

    if (confirm(`Xóa loại văn bản "${type.name}"?`)) {
      deleteTypeMutation.mutate(type.id);
    }
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
                <h3 className="text-sm font-semibold text-slate-800">{'Quy\u1EC1n & b\u1EA3o m\u1EADt m\u1EB7c \u0111\u1ECBnh'}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {'Document t\u1EA1o t\u1EEB lo\u1EA1i n\u00E0y s\u1EBD t\u1EF1 \u00E1p m\u1EE9c \u0111\u1ED9 b\u1EA3o m\u1EADt v\u00E0 ph\u1EA1m vi hi\u1EC3n th\u1ECB n\u00E0y. M\u00E0n h\u00ECnh t\u1EA1o tr\u00ECnh k\u00FD kh\u00F4ng c\u1EA7n ch\u1ECDn l\u1EA1i.'}
                </p>
              </div>

              {isPolicyLoading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  {'\u0110ang t\u1EA3i policy c\u1EE7a lo\u1EA1i t\u00E0i li\u1EC7u...'}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">{'Ph\u1EA1m vi hi\u1EC3n th\u1ECB m\u1EB7c \u0111\u1ECBnh'}</label>
                    <select
                      value={defaultVisibilityScope}
                      onChange={(event) => setDefaultVisibilityScope(event.target.value as 'public' | 'department' | 'private')}
                      className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="public">{'C\u00F4ng khai trong tenant'}</option>
                      <option value="department">{'Theo ph\u00F2ng ban'}</option>
                      <option value="private">{'Ri\u00EAng t\u01B0'}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">{'M\u1EE9c \u0111\u1ED9 b\u1EA3o m\u1EADt m\u1EB7c \u0111\u1ECBnh'}</label>
                    <select
                      value={defaultConfidentialLevel}
                      onChange={(event) => setDefaultConfidentialLevel(event.target.value as 'normal' | 'confidential' | 'secret' | 'top_secret')}
                      className="h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="normal">{'Th\u00F4ng th\u01B0\u1EDDng'}</option>
                      <option value="confidential">{'B\u1EA3o m\u1EADt'}</option>
                      <option value="secret">{'M\u1EADt'}</option>
                      <option value="top_secret">{'Tuy\u1EC7t m\u1EADt'}</option>
                    </select>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={inheritCreatorDepartment}
                      onChange={(event) => setInheritCreatorDepartment(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {'T\u1EF1 \u0111\u1ED9ng g\u00E1n ph\u00F2ng ban c\u1EE7a ng\u01B0\u1EDDi t\u1EA1o v\u00E0o document'}
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={forcePrivateUntilCompleted}
                      onChange={(event) => setForcePrivateUntilCompleted(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {'Lu\u00F4n \u0111\u1EC3 ri\u00EAng t\u01B0 khi m\u1EDBi t\u1EA1o (ghi \u0111\u00E8 ph\u1EA1m vi hi\u1EC3n th\u1ECB th\u00E0nh private)'}
                    </span>
                  </label>
                </div>
              )}
            </div>

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
