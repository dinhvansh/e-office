'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Users, Edit, Trash2, Search, FileText, User, Building2, Briefcase } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusTag } from '@/components/ui/status-tag';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/providers/auth-provider';
import { DocumentTypePermissionsTab } from '@/components/roles/DocumentTypePermissionsTab';
import { toast } from 'sonner';
import { useDestructiveConfirmation } from '@/components/providers/destructive-confirmation-provider';

interface Role {
  id: number;
  name: string;
  description?: string;
  is_system: boolean;
  role_permissions: Array<{
    permission: {
      id: number;
      resource: string;
      action: string;
      description?: string;
    };
  }>;
  _count: { user_roles: number };
}

interface DocumentItem {
  id: number;
  title?: string | null;
  original_file_name?: string | null;
  document_number?: string | null;
  status?: string | null;
  confidential_level?: string | null;
}

interface PermissionRecord {
  id: number;
  permission_source: 'share' | 'baseline';
  subject_type: 'user' | 'department' | 'position_in_department' | 'role';
  subject_id: number;
  scope_department_id: number;
  can_read: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_share: boolean;
  can_delete: boolean;
  granted_at: string;
}

interface DepartmentOption {
  id: number;
  name: string;
}

interface PositionOption {
  id: number;
  code?: string;
  name: string;
  is_active?: boolean;
}

interface UserOption {
  id: number;
  email: string;
  full_name?: string;
}

export default function RolesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'document-permissions' | 'system-roles'>('document-permissions');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [viewingRoleUsers, setViewingRoleUsers] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [documentSearch, setDocumentSearch] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [documentPermissionForm, setDocumentPermissionForm] = useState({
    subject_type: 'user' as 'user' | 'department' | 'position_in_department',
    subject_id: '',
    scope_department_id: '',
    can_read: true,
    can_edit: false,
    can_approve: false,
    can_share: false,
    can_delete: false,
  });
  const queryClient = useQueryClient();
  const { fetchJson } = useAuth();
  const confirmDestructive = useDestructiveConfirmation();

  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; permission_ids?: number[] }) => {
      if (editingRole) {
        console.log('Updating role:', editingRole.id, data);
        return fetchJson(`/roles/${editingRole.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      console.log('Creating role:', data);
      return fetchJson('/roles', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: async () => {
      console.log(editingRole ? 'Role updated successfully' : 'Role created successfully');
      setShowCreateModal(false);
      setEditingRole(null);
      setFormData({ name: '', description: '' });
      toast.success(editingRole ? 'Cập nhật vai trò thành công!' : 'Tạo vai trò thành công!');
      // Small delay to ensure backend has saved
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['roles'] });
        console.log('Refetched roles');
      }, 300);
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchJson<any>('/roles'),
    staleTime: 0, // Always refetch
    refetchOnMount: 'always', // Always refetch on mount
  });

  const { data: allPermissions } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: () => fetchJson<any>('/roles/permissions'),
  });

  const { data: documentsData, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['document-permissions-documents', documentSearch],
    enabled: false,
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (documentSearch.trim()) {
        params.set('search', documentSearch.trim());
      }
      const data = await fetchJson<{ documents: DocumentItem[] }>(`/documents?${params.toString()}`);
      return data.documents || [];
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['document-permissions-users'],
    enabled: false,
    queryFn: () => fetchJson<UserOption[]>('/users/active'),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['document-permissions-departments'],
    enabled: false,
    queryFn: async () => {
      const data = await fetchJson<any>('/departments');
      return Array.isArray(data) ? data : data?.departments || data?.data?.departments || data?.data || [];
    },
  });

  const { data: positionsData } = useQuery({
    queryKey: ['document-permissions-positions'],
    enabled: false,
    queryFn: async () => {
      const data = await fetchJson<any>('/positions');
      return data?.positions || data?.data?.positions || data?.data || data || [];
    },
  });

  const { data: documentPermissionsData, isLoading: isLoadingDocumentPermissions } = useQuery({
    queryKey: ['document-permissions', selectedDocumentId],
    enabled: false,
    queryFn: async () => {
      const data = await fetchJson<{ permissions: PermissionRecord[] }>(`/documents/${selectedDocumentId}/permissions`);
      return data.permissions || [];
    },
  });

  // Fetch users for a specific role
  const { data: roleUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['role-users', viewingRoleUsers?.id],
    queryFn: async () => {
      if (!viewingRoleUsers) return [];
      const response = await fetchJson<any>(`/roles/${viewingRoleUsers.id}/users`);
      return response.users || [];
    },
    enabled: !!viewingRoleUsers && showUsersDialog,
  });

  const documents = (documentsData || []) as DocumentItem[];
  const permissionUsers = (usersData || []) as UserOption[];
  const permissionDepartments = (departmentsData || []) as DepartmentOption[];
  const permissionPositions = ((positionsData || []) as PositionOption[]).filter((position) => position.is_active !== false);
  const currentDocumentPermissions = (documentPermissionsData || []) as PermissionRecord[];

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: number) => fetchJson(`/roles/${roleId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Xóa vai trò thành công!');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const grantDocumentPermissionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocumentId) {
        throw new Error('Vui lòng chọn tài liệu');
      }

      const subjectId = parseInt(documentPermissionForm.subject_id, 10);
      const scopeDepartmentId = documentPermissionForm.scope_department_id
        ? parseInt(documentPermissionForm.scope_department_id, 10)
        : undefined;

      return fetchJson(`/documents/${selectedDocumentId}/permissions`, {
        method: 'POST',
        body: JSON.stringify({
          permission_source: 'baseline',
          subject_type: documentPermissionForm.subject_type,
          subject_id: subjectId,
          scope_department_id: scopeDepartmentId,
          can_read: documentPermissionForm.can_read,
          can_edit: documentPermissionForm.can_edit,
          can_approve: documentPermissionForm.can_approve,
          can_share: documentPermissionForm.can_share,
          can_delete: documentPermissionForm.can_delete,
        }),
      });
    },
    onSuccess: async () => {
      toast.success('Đã cấp quyền tài liệu');
      setDocumentPermissionForm((current) => ({
        ...current,
        subject_id: '',
        scope_department_id: '',
        can_read: true,
        can_edit: false,
        can_approve: false,
        can_share: false,
        can_delete: false,
      }));
      await queryClient.invalidateQueries({ queryKey: ['document-permissions', selectedDocumentId] });
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error?.message || 'Không thể cấp quyền tài liệu'}`);
    },
  });

  const revokeDocumentPermissionMutation = useMutation({
    mutationFn: async (permission: PermissionRecord) => {
      if (!selectedDocumentId) {
        throw new Error('Vui lòng chọn tài liệu');
      }

      return fetchJson(`/documents/${selectedDocumentId}/permissions`, {
        method: 'DELETE',
        body: JSON.stringify({
          permission_source: permission.permission_source,
          subject_type: permission.subject_type,
          subject_id: permission.subject_id,
          scope_department_id: permission.subject_type === 'position_in_department' ? permission.scope_department_id : undefined,
        }),
      });
    },
    onSuccess: async () => {
      toast.success('Đã thu hồi quyền tài liệu');
      await queryClient.invalidateQueries({ queryKey: ['document-permissions', selectedDocumentId] });
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error?.message || 'Không thể thu hồi quyền tài liệu'}`);
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: number; permissionId: number }) =>
      fetchJson(`/roles/${roleId}/permissions/${permissionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Xóa quyền thành công!');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  // Sort by ID descending (newest first)
  const roles: Role[] = ((rolesData as any) || []).sort((a: Role, b: Role) => b.id - a.id);

  // Group permissions by resource
  const groupPermissions = (role: Role) => {
    const grouped: Record<string, string[]> = {};
    role.role_permissions.forEach((rp) => {
      const resource = rp.permission.resource;
      if (!grouped[resource]) grouped[resource] = [];
      grouped[resource].push(rp.permission.action);
    });
    return grouped;
  };

  const resourceLabels: Record<string, string> = {
    users: 'Người dùng',
    departments: 'Phòng ban',
    documents: 'Tài liệu',
    sign_requests: 'Yêu cầu ký',
    roles: 'Vai trò',
    audit_logs: 'Nhật ký',
    settings: 'Cài đặt',
  };

  useEffect(() => {
    if (!documents.length) {
      setSelectedDocumentId(null);
      return;
    }

    setSelectedDocumentId((current) => {
      if (current && documents.some((document) => document.id === current)) {
        return current;
      }
      return documents[0].id;
    });
  }, [documents]);

  const getDocumentDisplayName = (document: DocumentItem) =>
    document.title || document.original_file_name || document.document_number || `Tài liệu #${document.id}`;

  const getPermissionSubjectLabel = (permission: PermissionRecord) => {
    if (permission.subject_type === 'user') {
      const match = permissionUsers.find((user) => user.id === permission.subject_id);
      return match?.full_name || match?.email || `User #${permission.subject_id}`;
    }

    if (permission.subject_type === 'department') {
      const match = permissionDepartments.find((department) => department.id === permission.subject_id);
      return match?.name || `Phòng ban #${permission.subject_id}`;
    }

    if (permission.subject_type === 'position_in_department') {
      const position = permissionPositions.find((item) => item.id === permission.subject_id);
      const department = permissionDepartments.find((item) => item.id === permission.scope_department_id);
      return `${position?.name || `Chức danh #${permission.subject_id}`} / ${department?.name || `Phòng ban #${permission.scope_department_id}`}`;
    }

    return `Đối tượng #${permission.subject_id}`;
  };

  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) || null;
  const canSubmitDocumentPermission =
    !!selectedDocumentId &&
    !!documentPermissionForm.subject_id &&
    (documentPermissionForm.subject_type !== 'position_in_department' || !!documentPermissionForm.scope_department_id) &&
    [
      documentPermissionForm.can_read,
      documentPermissionForm.can_edit,
      documentPermissionForm.can_approve,
      documentPermissionForm.can_share,
      documentPermissionForm.can_delete,
    ].some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Vai trò & Quyền"
        description="Tra cứu quyền tài liệu và quản trị vai trò hệ thống"
        iconColor="text-rose-600"
        actions={
          activeTab === 'system-roles' ? (
            <Button onClick={() => {
              setEditingRole(null);
              setFormData({ name: '', description: '' });
              setSelectedPermissions([]);
              setShowCreateModal(true);
            }} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30">
              <Plus className="w-4 h-4 mr-2" />
              Tạo vai trò mới
            </Button>
          ) : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'document-permissions' | 'system-roles')} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="document-permissions">Quyền tài liệu</TabsTrigger>
          <TabsTrigger value="system-roles">Vai trò hệ thống</TabsTrigger>
        </TabsList>

        <TabsContent value="document-permissions" className="space-y-6">
          <DocumentTypePermissionsTab fetchJson={fetchJson} />
        </TabsContent>

        <TabsContent value="system-roles" className="space-y-6">
      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Card className="p-6 space-y-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
            <Card className="p-6 space-y-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
            <Card className="p-6 space-y-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          </>
        ) : roles.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Shield}
              title="Chưa có vai trò"
              description="Tạo vai trò đầu tiên để phân quyền cho người dùng trong hệ thống"
              action={{
                label: "Tạo vai trò mới",
                onClick: () => {
                  setEditingRole(null);
                  setFormData({ name: '', description: '' });
                  setSelectedPermissions([]);
                  setShowCreateModal(true);
                },
              }}
            />
          </div>
        ) : (
          roles.map((role) => {
            const permissions = groupPermissions(role);
            return (
              <Card key={role.id} className="hover:shadow-lg hover:border-primary/50 transition-all duration-200">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {role.name}
                        {role.is_system && (
                          <StatusTag 
                            status="Hệ thống" 
                            variant="info"
                            className="text-xs"
                          />
                        )}
                      </CardTitle>
                      {role.description && (
                        <CardDescription className="mt-1">
                          {role.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{role._count.user_roles} người dùng</span>
                    </div>
                    {role._count.user_roles > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewingRoleUsers(role);
                          setShowUsersDialog(true);
                        }}
                        className="text-xs"
                      >
                        Xem danh sách
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Quyền:</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(permissions).slice(0, 3).map(([resource, actions]) => (
                        <Badge key={resource} variant="outline" className="text-xs">
                          {resourceLabels[resource] || resource}
                        </Badge>
                      ))}
                      {Object.entries(permissions).length > 3 && (
                        <Badge className="text-xs bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100">
                          +{Object.entries(permissions).length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedRole(role)}
                  >
                    Xem chi tiết
                  </Button>
                  {!role.is_system && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => {
                          setEditingRole(role);
                          setFormData({ name: role.name, description: role.description || '' });
                          setSelectedPermissions(role.role_permissions.map(rp => rp.permission.id));
                          setShowCreateModal(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => {
                          if (role._count.user_roles > 0) {
                            toast.error('Không thể xóa vai trò đang được sử dụng');
                            return;
                          }
                          confirmDestructive({
                            title: 'Xóa vai trò',
                            targetName: role.name,
                            description: 'Vai trò này sẽ bị xóa và không thể khôi phục từ màn hình này.',
                            confirmLabel: 'Xóa vai trò',
                            errorMessage: 'Không thể xóa vai trò. Vui lòng thử lại.',
                          }, () => deleteRoleMutation.mutateAsync(role.id));
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
        </TabsContent>
      </Tabs>

      {/* Role Detail Modal */}
      <Dialog open={!!selectedRole} onOpenChange={(open) => !open && setSelectedRole(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              {selectedRole?.name}
            </DialogTitle>
            {selectedRole?.description && (
              <DialogDescription>{selectedRole.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">
                Danh sách quyền ({selectedRole?.role_permissions.length || 0})
              </h3>
              <div className="space-y-2">
                {selectedRole?.role_permissions.map((rp) => (
                  <div
                    key={rp.permission.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors group"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {resourceLabels[rp.permission.resource] || rp.permission.resource}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {rp.permission.action}
                        {rp.permission.description && (
                          <span className="ml-2">• {rp.permission.description}</span>
                        )}
                      </div>
                    </div>
                    {!selectedRole.is_system && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => {
                          confirmDestructive({
                            title: 'Xóa quyền khỏi vai trò',
                            targetName: `${rp.permission.action} — ${selectedRole.name}`,
                            description: 'Quyền này sẽ không còn được cấp qua vai trò đã chọn.',
                            confirmLabel: 'Xóa quyền',
                            errorMessage: 'Không thể xóa quyền. Vui lòng thử lại.',
                          }, () => removePermissionMutation.mutateAsync({
                              roleId: selectedRole.id,
                              permissionId: rp.permission.id
                            }));
                        }}
                        title="Xóa quyền"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRole(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          setEditingRole(null);
          setFormData({ name: '', description: '' });
          setSelectedPermissions([]);
        }
      }}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}</DialogTitle>
            <DialogDescription>
              {editingRole 
                ? 'Cập nhật thông tin vai trò' 
                : 'Sau khi tạo, bạn có thể gán quyền cho vai trò này.'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (formData.name.trim()) {
                createRoleMutation.mutate({
                  ...formData,
                  permission_ids: selectedPermissions
                });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Tên vai trò *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên vai trò"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả vai trò"
                rows={3}
              />
            </div>

            {/* Permissions Selection - Enhanced UI */}
            {allPermissions && allPermissions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Quyền hạn</Label>
                  <Badge variant="secondary" className="text-xs">
                    {selectedPermissions.length} / {allPermissions.length}
                  </Badge>
                </div>
                <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                  {Object.entries(
                    allPermissions.reduce((acc: any, perm: any) => {
                      if (!acc[perm.resource]) acc[perm.resource] = [];
                      acc[perm.resource].push(perm);
                      return acc;
                    }, {})
                  ).map(([resource, perms]: [string, any]) => {
                    const allSelected = perms.every((p: any) => selectedPermissions.includes(p.id));
                    const someSelected = perms.some((p: any) => selectedPermissions.includes(p.id));
                    
                    return (
                      <div key={resource} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">
                              {resourceLabels[resource] || resource}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {perms.filter((p: any) => selectedPermissions.includes(p.id)).length}/{perms.length}
                            </Badge>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (allSelected) {
                                setSelectedPermissions(
                                  selectedPermissions.filter(id => !perms.find((p: any) => p.id === id))
                                );
                              } else {
                                setSelectedPermissions([
                                  ...selectedPermissions,
                                  ...perms.filter((p: any) => !selectedPermissions.includes(p.id)).map((p: any) => p.id)
                                ]);
                              }
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 ml-6">
                          {perms.map((perm: any) => (
                            <label 
                              key={perm.id} 
                              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors group"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(perm.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPermissions([...selectedPermissions, perm.id]);
                                  } else {
                                    setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm group-hover:text-primary transition-colors">
                                {perm.action}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <span>Chọn quyền phù hợp với vai trò này</span>
                  <span className="font-medium">{selectedPermissions.length} quyền đã chọn</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRole(null);
                  setFormData({ name: '', description: '' });
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createRoleMutation.isPending}>
                {createRoleMutation.isPending 
                  ? (editingRole ? 'Đang cập nhật...' : 'Đang tạo...') 
                  : (editingRole ? 'Cập nhật' : 'Tạo')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Users Dialog */}
      <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Người dùng có vai trò: {viewingRoleUsers?.name}</DialogTitle>
            <DialogDescription>
              Danh sách {viewingRoleUsers?._count.user_roles || 0} người dùng đang có vai trò này
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            {isLoadingUsers ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : roleUsers && roleUsers.length > 0 ? (
              <div className="space-y-2">
                {roleUsers.map((user: any) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.full_name || user.email}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.department && (
                        <Badge variant="outline" className="text-xs">
                          {user.department.name}
                        </Badge>
                      )}
                      {user.position && (
                        <Badge variant="outline" className="text-xs">
                          {user.position.name}
                        </Badge>
                      )}
                      <StatusTag status={user.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Chưa có người dùng"
                description="Chưa có người dùng nào được gán vai trò này"
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUsersDialog(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
