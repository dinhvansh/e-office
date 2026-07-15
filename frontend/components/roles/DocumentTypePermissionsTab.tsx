'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, FileType, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentType, DocumentTypePolicy } from '@/lib/types';

type SubjectType = 'specific_user' | 'specific_department' | 'legacy_position_in_department';
type PermissionKey = 'CREATE' | 'VIEW' | 'DOWNLOAD' | 'EDIT' | 'COMMENT' | 'SHARE' | 'DELETE';

type PermissionEntry = {
  id: string;
  subject_type: SubjectType;
  subject_id: string;
  scope_department_id: string;
  permissions: PermissionKey[];
  status_limit: string[];
  is_active: boolean;
};

type PermissionForm = Omit<PermissionEntry, 'id'>;

type UserOption = {
  id: number;
  email: string;
  full_name?: string;
};

type DepartmentOption = {
  id: number;
  name: string;
};

type PositionOption = {
  id: number;
  code?: string;
  name: string;
  is_active?: boolean;
};

const permissionOptions: Array<{ value: PermissionKey; label: string }> = [
  { value: 'CREATE', label: 'Tạo' },
  { value: 'VIEW', label: 'Xem' },
  { value: 'DOWNLOAD', label: 'Tải xuống' },
  { value: 'EDIT', label: 'Chỉnh sửa' },
  { value: 'COMMENT', label: 'Bình luận' },
  { value: 'SHARE', label: 'Chia sẻ' },
  { value: 'DELETE', label: 'Xóa' },
];

const statusOptions = ['DRAFT', 'REJECTED', 'SUBMITTED', 'APPROVED', 'SIGNED'];

const blankForm = (): PermissionForm => ({
  subject_type: 'specific_user',
  subject_id: '',
  scope_department_id: '',
  permissions: ['VIEW', 'DOWNLOAD'],
  status_limit: [],
  is_active: true,
});

const defaultVisibility = {
  default_visibility_scope: 'department' as const,
  default_security_level: 'normal' as const,
  auto_assign_creator_department: true,
  force_private_on_create: false,
};

type FetchJson = <T = any>(url: string, options?: RequestInit) => Promise<T>;

export function DocumentTypePermissionsTab({ fetchJson }: { fetchJson: FetchJson }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [requestedDocumentTypeId, setSelectedDocumentTypeId] = useState<number | null>(null);
  const [policy, setPolicy] = useState<DocumentTypePolicy | null>(null);
  const [entries, setEntries] = useState<PermissionEntry[]>([]);
  const [form, setForm] = useState<PermissionForm>(blankForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);

  const { data: documentTypes = [], isLoading: isLoadingTypes } = useQuery({
    queryKey: ['document-type-permission-types'],
    queryFn: () => fetchJson<DocumentType[]>('/document-types'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['document-type-permission-users'],
    queryFn: () => fetchJson<UserOption[]>('/users/active').catch(() => []),
  });

  const { data: departmentsData = [] } = useQuery({
    queryKey: ['document-type-permission-departments'],
    queryFn: async () => {
      const data = await fetchJson<any>('/departments').catch(() => []);
      return Array.isArray(data) ? data : data?.departments || data?.data?.departments || data?.data || [];
    },
  });

  const { data: positionsData = [] } = useQuery({
    queryKey: ['document-type-permission-positions'],
    queryFn: async () => {
      const data = await fetchJson<any>('/positions').catch(() => []);
      return data?.positions || data?.data?.positions || data?.data || data || [];
    },
  });

  const departments = departmentsData as DepartmentOption[];
  const positions = (positionsData as PositionOption[]).filter((item) => item.is_active !== false);

  const filteredDocumentTypes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return documentTypes;
    return documentTypes.filter((item) =>
      [item.code, item.name, item.description || ''].some((value) => String(value || '').toLowerCase().includes(keyword))
    );
  }, [documentTypes, search]);

  const selectedDocumentTypeId = filteredDocumentTypes.some((item) => item.id === requestedDocumentTypeId)
    ? requestedDocumentTypeId
    : filteredDocumentTypes[0]?.id ?? null;

  useEffect(() => {
    if (!selectedDocumentTypeId) return;

    let cancelled = false;
    void Promise.resolve().then(() => {
      setIsLoadingPolicy(true);
      return fetchJson<DocumentTypePolicy>(`/settings/document-type-policy/${selectedDocumentTypeId}`)
      .then((nextPolicy) => {
        if (cancelled) return;
        setPolicy(nextPolicy);
        setEntries(
          (nextPolicy.acl_templates || [])
            .filter((item) => item.subject_type === 'specific_user' || item.subject_type === 'specific_department' || item.subject_type === 'legacy_position_in_department')
            .map((item, index) => ({
              id: item.id || `${selectedDocumentTypeId}-${index}`,
              subject_type: item.subject_type as SubjectType,
              subject_id: item.subject_id ? String(item.subject_id) : '',
              scope_department_id: item.scope_department_id ? String(item.scope_department_id) : '',
              permissions: (item.permissions || []).filter(
                (permission): permission is PermissionKey =>
                  permission === 'CREATE' ||
                  permission === 'VIEW' ||
                  permission === 'DOWNLOAD' ||
                  permission === 'EDIT' ||
                  permission === 'COMMENT' ||
                  permission === 'SHARE' ||
                  permission === 'DELETE'
              ),
              status_limit: item.status_limit || [],
              is_active: item.is_active !== false,
            }))
        );
        setForm(blankForm());
        setEditingId(null);
      })
      .catch(() => {
        if (cancelled) return;
        setPolicy(null);
        setEntries([]);
        setForm(blankForm());
        setEditingId(null);
      })
        .finally(() => {
          if (!cancelled) setIsLoadingPolicy(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [fetchJson, selectedDocumentTypeId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocumentTypeId) {
        throw new Error('Vui lòng chọn loại văn bản');
      }

      const nextPolicy: DocumentTypePolicy = {
        version: policy?.version || 2,
        visibility: policy?.visibility || defaultVisibility,
        acl_templates: entries.map((item) => ({
          id: item.id,
          subject_type: item.subject_type,
          subject_id: item.subject_id ? Number(item.subject_id) : null,
          scope_department_id: item.scope_department_id ? Number(item.scope_department_id) : null,
          scope: 'ASSIGNED_ONLY',
          permissions: item.permissions,
          status_limit: item.status_limit.length ? item.status_limit : null,
          is_active: item.is_active,
        })),
        advanced_policies: policy?.advanced_policies || [],
        legacy_detail_permissions: policy?.legacy_detail_permissions || [],
        legacy_rules: policy?.legacy_rules || {},
      };

      await fetchJson(`/settings/document-type-policy/${selectedDocumentTypeId}`, {
        method: 'POST',
        body: JSON.stringify(nextPolicy),
      });
    },
    onSuccess: async () => {
      toast.success('Đã lưu quyền tài liệu theo loại văn bản');
      if (selectedDocumentTypeId) {
        await queryClient.invalidateQueries({ queryKey: ['document-type-permission-types'] });
      }
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error?.message || 'Không thể lưu quyền tài liệu'}`);
    },
  });

  const selectedDocumentType = filteredDocumentTypes.find((item) => item.id === selectedDocumentTypeId) || null;

  const canSubmit = !!form.subject_id && (form.subject_type !== 'legacy_position_in_department' || !!form.scope_department_id) && form.permissions.length > 0;

  const getEntryLabel = (entry: PermissionEntry) => {
    if (entry.subject_type === 'specific_user') {
      const match = users.find((item) => item.id === Number(entry.subject_id));
      return match?.full_name || match?.email || `User #${entry.subject_id}`;
    }
    if (entry.subject_type === 'specific_department') {
      const match = departments.find((item) => item.id === Number(entry.subject_id));
      return match?.name || `Phòng ban #${entry.subject_id}`;
    }
    const position = positions.find((item) => item.id === Number(entry.subject_id));
    const department = departments.find((item) => item.id === Number(entry.scope_department_id));
    return `${position?.name || `Chức danh #${entry.subject_id}`} / ${department?.name || `Phòng ban #${entry.scope_department_id}`}`;
  };

  const getSubjectLabel = (subjectType: SubjectType) => {
    if (subjectType === 'specific_user') return 'Người dùng cụ thể';
    if (subjectType === 'specific_department') return 'Phòng ban';
    return 'Chức danh trong phòng ban';
  };

  const handleSubmitRule = () => {
    if (!form.subject_id) {
      toast.error('Vui lòng chọn đối tượng áp dụng');
      return;
    }

    if (form.subject_type === 'legacy_position_in_department' && !form.scope_department_id) {
      toast.error('Vui lòng chọn phòng ban cho chức danh');
      return;
    }

    if (form.permissions.length === 0) {
      toast.error('Vui lòng chọn ít nhất một quyền');
      return;
    }

    if (
      form.permissions.includes('DELETE') &&
      (form.subject_type === 'specific_department' || form.subject_type === 'legacy_position_in_department')
    ) {
      toast.error('Không cấp quyền Xóa rộng cho phòng ban hoặc chức danh trong phòng ban');
      return;
    }

    const nextEntry: PermissionEntry = {
      ...form,
      id: editingId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    setEntries((current) => (editingId ? current.map((item) => (item.id === editingId ? nextEntry : item)) : [...current, nextEntry]));
    setForm(blankForm());
    setEditingId(null);
  };

  const handleEditRule = (entry: PermissionEntry) => {
    setForm({
      subject_type: entry.subject_type,
      subject_id: entry.subject_id,
      scope_department_id: entry.scope_department_id,
      permissions: entry.permissions,
      status_limit: entry.status_limit,
      is_active: entry.is_active,
    });
    setEditingId(entry.id);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileType className="h-5 w-5 text-blue-600" />
              Chọn loại văn bản
            </CardTitle>
            <CardDescription>
              Đây là nơi duy nhất cấu hình quyền tài liệu theo loại văn bản. Quyền phê duyệt và ký luôn đi theo workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã hoặc tên loại văn bản..."
            />

            <div className="rounded-lg border border-slate-200">
              {isLoadingTypes ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : filteredDocumentTypes.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Không có loại văn bản phù hợp.</div>
              ) : (
                <div className="max-h-[460px] divide-y overflow-y-auto">
                  {filteredDocumentTypes.map((item) => {
                    const selected = item.id === selectedDocumentTypeId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedDocumentTypeId(item.id)}
                        className={`w-full px-4 py-3 text-left transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.code}</span>
                          {item.description && <span>{item.description}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Quyền tài liệu theo loại</CardTitle>
              <CardDescription>
                {selectedDocumentType ? `Đang cấu hình cho: ${selectedDocumentType.name} (${selectedDocumentType.code})` : 'Chọn loại văn bản để bắt đầu'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                {false && <div>
                  <div className="text-sm font-medium text-slate-900">Trạng thái rule</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Chỉ cấu hình quyền <strong>Xem, Tải xuống, Chỉnh sửa, Bình luận, Chia sẻ, Xóa</strong> ở đây. Quyền <strong>Phê duyệt</strong> và <strong>Ký</strong> được quyết định bởi workflow.
                  </div>
                </div>}
                <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, is_active: true }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      form.is_active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Hoạt động
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, is_active: false }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      !form.is_active ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Không hoạt động
                  </button>
                </div>
              </div>

              {isLoadingPolicy ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Đối tượng</Label>
                    <select
                      value={form.subject_type}
                      onChange={(event) => setForm((current) => ({ ...current, subject_type: event.target.value as SubjectType, subject_id: '', scope_department_id: '' }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="specific_user">Người dùng cụ thể</option>
                      <option value="specific_department">Phòng ban</option>
                      <option value="legacy_position_in_department">Chức danh trong phòng ban</option>
                    </select>
                  </div>

                  {form.subject_type === 'specific_user' && (
                    <div className="space-y-2">
                      <Label>Người dùng</Label>
                      <select
                        value={form.subject_id}
                        onChange={(event) => setForm((current) => ({ ...current, subject_id: event.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value="">-- Chọn người dùng --</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.subject_type === 'specific_department' && (
                    <div className="space-y-2">
                      <Label>Phòng ban</Label>
                      <select
                        value={form.subject_id}
                        onChange={(event) => setForm((current) => ({ ...current, subject_id: event.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value="">-- Chọn phòng ban --</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.subject_type === 'legacy_position_in_department' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Phòng ban</Label>
                        <select
                          value={form.scope_department_id}
                          onChange={(event) => setForm((current) => ({ ...current, scope_department_id: event.target.value }))}
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                        >
                          <option value="">-- Chọn phòng ban --</option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Chức danh</Label>
                        <select
                          value={form.subject_id}
                          onChange={(event) => setForm((current) => ({ ...current, subject_id: event.target.value }))}
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                        >
                          <option value="">-- Chọn chức danh --</option>
                          {positions.map((position) => (
                            <option key={position.id} value={position.id}>
                              {position.name}{position.code ? ` (${position.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Quyền</Label>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {permissionOptions.map((permission) => (
                        <label key={permission.value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(permission.value)}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                permissions: event.target.checked
                                  ? Array.from(new Set([...current.permissions, permission.value]))
                                  : current.permissions.filter((item) => item !== permission.value),
                              }))
                            }
                            className="h-4 w-4"
                          />
                          <span>{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Giới hạn trạng thái</Label>
                    <div className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
                      {statusOptions.map((status) => (
                        <label key={status} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.status_limit.includes(status)}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                status_limit: event.target.checked
                                  ? [...current.status_limit, status]
                                  : current.status_limit.filter((item) => item !== status),
                              }))
                            }
                            className="h-4 w-4"
                          />
                          <span>{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {editingId && (
                      <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(blankForm()); }}>
                        Hủy sửa
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={handleSubmitRule} disabled={!canSubmit}>
                      {editingId ? 'Cập nhật rule' : 'Thêm rule'}
                    </Button>
                    <Button type="button" onClick={() => saveMutation.mutate()} disabled={!selectedDocumentTypeId || saveMutation.isPending}>
                      {saveMutation.isPending ? 'Đang lưu...' : 'Lưu quyền loại văn bản'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Danh sách quyền hiện có</CardTitle>
              <CardDescription>Các rule dưới đây sẽ được snapshot xuống tài liệu khi tạo mới từ loại văn bản này.</CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-sm text-muted-foreground">Loại văn bản này chưa có rule quyền nào.</div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={entry.is_active ? 'default' : 'secondary'}>{entry.is_active ? 'Đang bật' : 'Đang tắt'}</Badge>
                            <span className="text-sm font-medium text-slate-900">{getSubjectLabel(entry.subject_type)}</span>
                            <span className="text-sm text-muted-foreground">{getEntryLabel(entry)}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {entry.permissions.map((permission) => (
                              <Badge key={permission} variant="outline">
                                {permissionOptions.find((item) => item.value === permission)?.label || permission}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.status_limit.length ? `Áp dụng ở trạng thái: ${entry.status_limit.join(', ')}` : 'Áp dụng ở mọi trạng thái'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditRule(entry)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
