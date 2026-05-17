'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, Check, GripVertical, Mail, Plus, Search, User as UserIcon, Users, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface Signer {
  id: number;
  email: string;
  name: string;
  role?: string;
  signing_order?: number;
  is_internal?: boolean;
}

interface DirectoryUser {
  id: number;
  email: string;
  full_name?: string | null;
  department?: { id: number; name: string } | null;
  position?: { id: number; name: string; code?: string | null } | null;
}

interface ExternalOrg {
  id: number;
  name: string;
  code?: string | null;
  email?: string | null;
  contact_person?: string | null;
  is_active?: boolean;
}

interface ManageSignersDialogProps {
  signRequestId: number;
  signers: Signer[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  fetchJson: <T = any>(path: string, init?: RequestInit) => Promise<T>;
  allowReorder?: boolean;
}

type AddMode = 'internal' | 'external';

export function ManageSignersDialog({
  signRequestId,
  signers,
  isOpen,
  onClose,
  onUpdate,
  fetchJson,
  allowReorder = false,
}: ManageSignersDialogProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>('signer');
  const [addMode, setAddMode] = useState<AddMode>('internal');
  const [userSearch, setUserSearch] = useState('');
  const [externalSearch, setExternalSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedExternalOrgId, setSelectedExternalOrgId] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localSigners, setLocalSigners] = useState<Signer[]>(signers);

  React.useEffect(() => {
    setLocalSigners(signers);
  }, [signers]);

  const { data: directoryUsers = [], isLoading: isLoadingUsers } = useQuery<DirectoryUser[]>({
    queryKey: ['users-directory'],
    enabled: isOpen,
    queryFn: async () => {
      const data = await fetchJson<{ users: DirectoryUser[] }>('/users/directory');
      return Array.isArray(data?.users) ? data.users : [];
    },
  });

  const { data: externalOrgs = [], isLoading: isLoadingExternalOrgs } = useQuery<ExternalOrg[]>({
    queryKey: ['external-orgs-for-signers'],
    enabled: isOpen && addMode === 'external',
    queryFn: async () => {
      const data = await fetchJson<ExternalOrg[] | { orgs?: ExternalOrg[] }>('/external-orgs');
      if (Array.isArray(data)) return data;
      return Array.isArray(data?.orgs) ? data.orgs : [];
    },
  });

  const existingEmails = useMemo(() => new Set(localSigners.map((signer) => signer.email.toLowerCase())), [localSigners]);

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();
    return directoryUsers
      .filter((user) => !existingEmails.has(user.email.toLowerCase()))
      .filter((user) => {
        if (!keyword) return true;
        return [user.email, user.full_name, user.department?.name, user.position?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      })
      .slice(0, 8);
  }, [directoryUsers, existingEmails, userSearch]);

  const filteredExternalOrgs = useMemo(() => {
    const keyword = externalSearch.trim().toLowerCase();
    return externalOrgs
      .filter((org) => org.is_active !== false)
      .filter((org) => {
        if (!keyword) return true;
        return [org.name, org.code, org.email, org.contact_person]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      })
      .slice(0, 8);
  }, [externalOrgs, externalSearch]);

  const resetAddForm = () => {
    setNewEmail('');
    setNewName('');
    setNewRole('signer');
    setSelectedUserId(null);
    setSelectedExternalOrgId(null);
    setUserSearch('');
    setExternalSearch('');
  };

  const selectInternalUser = (user: DirectoryUser) => {
    setSelectedUserId(user.id);
    setSelectedExternalOrgId(null);
    setNewEmail(user.email);
    setNewName(user.full_name || user.email);
  };

  const selectExternalOrg = (org: ExternalOrg) => {
    setSelectedExternalOrgId(org.id);
    setSelectedUserId(null);
    setNewEmail(org.email || '');
    setNewName(org.contact_person || org.name);
  };

  const addSignerMutation = useMutation({
    mutationFn: async (signer: { email: string; name: string; role: string }) => {
      return fetchJson(`/sign-requests/${signRequestId}/signers`, {
        method: 'POST',
        body: JSON.stringify(signer),
      });
    },
    onSuccess: () => {
      toast.success('Đã thêm người ký');
      resetAddForm();
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể thêm người ký');
    },
  });

  const removeSignerMutation = useMutation({
    mutationFn: async (signerId: number) => {
      return fetchJson(`/sign-requests/${signRequestId}/signers/${signerId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast.success('Đã xóa người ký');
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể xóa người ký');
    },
  });

  const reorderSignersMutation = useMutation({
    mutationFn: async (reorderedSigners: Signer[]) => {
      const updates = reorderedSigners.map((signer, index) => ({
        id: signer.id,
        signing_order: index + 1,
      }));

      return fetchJson(`/sign-requests/${signRequestId}/signers/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ signers: updates }),
      });
    },
    onSuccess: () => {
      toast.success('Đã cập nhật thứ tự ký');
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể cập nhật thứ tự');
      setLocalSigners(signers);
    },
  });

  const updateSignerMutation = useMutation({
    mutationFn: async ({ signerId, role }: { signerId: number; role: string }) => {
      return fetchJson(`/sign-requests/${signRequestId}/signers/${signerId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò');
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể cập nhật vai trò');
    },
  });

  const handleAddSigner = () => {
    const email = newEmail.trim();
    const name = newName.trim();

    if (addMode === 'internal' && !selectedUserId) {
      toast.error('Vui lòng chọn người dùng nội bộ');
      return;
    }
    if (!email || !name) {
      toast.error('Vui lòng nhập đầy đủ email và tên');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email không hợp lệ');
      return;
    }
    if (existingEmails.has(email.toLowerCase())) {
      toast.error('Người ký này đã có trong danh sách');
      return;
    }

    addSignerMutation.mutate({ email, name, role: newRole });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const nextSigners = [...localSigners];
    const draggedItem = nextSigners[draggedIndex];
    nextSigners.splice(draggedIndex, 1);
    nextSigners.splice(index, 0, draggedItem);

    setLocalSigners(nextSigners);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      reorderSignersMutation.mutate(localSigners);
    }
    setDraggedIndex(null);
  };

  const handleRoleChange = (signerId: number, role: string) => {
    updateSignerMutation.mutate({ signerId, role });
  };

  const handleRemoveSigner = (signerId: number) => {
    if (localSigners.length <= 1) {
      toast.error('Phải có ít nhất 1 người ký');
      return;
    }

    if (confirm('Bạn có chắc muốn xóa người ký này?\n\nCác vị trí ký đã gán cho người này sẽ bị xóa.')) {
      removeSignerMutation.mutate(signerId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Quản lý người ký
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Danh sách người ký ({localSigners.length})</h4>
            {allowReorder && localSigners.length > 1 && <span className="text-xs text-gray-500">Kéo thả để sắp xếp lại</span>}
          </div>

          {localSigners.length === 0 ? (
            <div className="py-8 text-center text-gray-500">Chưa có người ký nào</div>
          ) : (
            <div className="space-y-2">
              {localSigners.map((signer, index) => (
                <div
                  key={signer.id}
                  draggable={allowReorder}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                    allowReorder ? 'cursor-move hover:border-blue-300 hover:bg-blue-50' : 'hover:bg-gray-50'
                  } ${draggedIndex === index ? 'scale-95 opacity-50' : ''}`}
                >
                  {allowReorder && <GripVertical className="h-5 w-5 flex-shrink-0 text-gray-400" />}

                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-medium">{signer.name}</div>
                      {signer.is_internal && <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Nội bộ</span>}
                    </div>
                    <div className="truncate text-xs text-gray-500">{signer.email}</div>
                    <div className="mt-2">
                      <select
                        value={signer.role || 'signer'}
                        onChange={(event) => handleRoleChange(signer.id, event.target.value)}
                        disabled={updateSignerMutation.isPending}
                        className="rounded border bg-white px-2 py-1 text-xs outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="signer">Người ký</option>
                        <option value="approver">Người phê duyệt</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSigner(signer.id)}
                    disabled={localSigners.length === 1 || removeSignerMutation.isPending}
                    className="flex-shrink-0"
                    title={localSigners.length === 1 ? 'Phải có ít nhất 1 người ký' : 'Xóa người ký'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Plus className="h-4 w-4" />
              Thêm người ký mới
            </h4>
            <div className="flex rounded-lg border bg-gray-50 p-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  setAddMode('internal');
                  resetAddForm();
                }}
                className={`rounded-md px-3 py-1.5 ${addMode === 'internal' ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-gray-600'}`}
              >
                Nội bộ
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode('external');
                  resetAddForm();
                }}
                className={`rounded-md px-3 py-1.5 ${addMode === 'external' ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-gray-600'}`}
              >
                Bên ngoài
              </button>
            </div>
          </div>

          {addMode === 'internal' && (
            <div className="space-y-3 rounded-lg border bg-slate-50 p-3">
              <div>
                <Label htmlFor="internal-user-search" className="text-xs">Tìm người dùng nội bộ</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="internal-user-search"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Tìm theo tên, email, phòng ban hoặc chức danh"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-md border bg-white">
                {isLoadingUsers ? (
                  <div className="p-3 text-sm text-gray-500">Đang tải danh sách người dùng...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">Không tìm thấy người dùng phù hợp.</div>
                ) : (
                  filteredUsers.map((user) => {
                    const selected = selectedUserId === user.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectInternalUser(user)}
                        className={`flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 ${selected ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">{user.full_name || user.email}</div>
                          <div className="truncate text-xs text-gray-500">{user.email}</div>
                          {(user.department?.name || user.position?.name) && (
                            <div className="truncate text-xs text-gray-400">
                              {[user.department?.name, user.position?.name].filter(Boolean).join(' - ')}
                            </div>
                          )}
                        </div>
                        {selected && <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border bg-white px-3 py-2">
                  <div className="text-xs font-medium text-gray-500">Đã chọn</div>
                  {selectedUserId ? (
                    <div className="mt-1">
                      <div className="truncate text-sm font-medium text-gray-900">{newName}</div>
                      <div className="truncate text-xs text-gray-500">{newEmail}</div>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-gray-400">Chưa chọn người dùng</div>
                  )}
                </div>

                <div>
                  <Label htmlFor="new-role-internal" className="text-xs">Vai trò *</Label>
                  <select
                    id="new-role-internal"
                    value={newRole}
                    onChange={(event) => setNewRole(event.target.value)}
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="signer">Người ký</option>
                    <option value="approver">Người phê duyệt</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {addMode === 'external' && (
            <div className="space-y-3 rounded-lg border bg-orange-50/50 p-3">
              <div>
                <Label htmlFor="external-org-search" className="text-xs">Chọn từ tổ chức/đối tác ngoài</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="external-org-search"
                    value={externalSearch}
                    onChange={(event) => setExternalSearch(event.target.value)}
                    placeholder="Tìm theo tên tổ chức, mã, email hoặc người liên hệ"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="max-h-44 overflow-y-auto rounded-md border bg-white">
                {isLoadingExternalOrgs ? (
                  <div className="p-3 text-sm text-gray-500">Đang tải danh sách tổ chức ngoài...</div>
                ) : filteredExternalOrgs.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">Chưa có tổ chức ngoài phù hợp. Có thể nhập thủ công bên dưới.</div>
                ) : (
                  filteredExternalOrgs.map((org) => {
                    const selected = selectedExternalOrgId === org.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => selectExternalOrg(org)}
                        className={`flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-orange-50 ${selected ? 'bg-orange-50' : ''}`}
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {org.name}{org.code ? ` (${org.code})` : ''}
                          </div>
                          <div className="truncate text-xs text-gray-500">
                            {[org.contact_person, org.email].filter(Boolean).join(' - ') || 'Chưa có email liên hệ'}
                          </div>
                        </div>
                        {selected && <Check className="h-4 w-4 flex-shrink-0 text-orange-600" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="text-xs font-medium text-gray-500">Hoặc nhập người ký ngoài thủ công</div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="new-email" className="text-xs">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="email@example.com"
                      value={newEmail}
                      onChange={(event) => {
                        setNewEmail(event.target.value);
                        setSelectedExternalOrgId(null);
                      }}
                      className="pl-9"
                      onKeyDown={(event) => event.key === 'Enter' && handleAddSigner()}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-name" className="text-xs">Họ tên / đơn vị *</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="new-name"
                      type="text"
                      placeholder="Nguyễn Văn A hoặc Công ty ABC"
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      className="pl-9"
                      onKeyDown={(event) => event.key === 'Enter' && handleAddSigner()}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-role-external" className="text-xs">Vai trò *</Label>
                  <select
                    id="new-role-external"
                    value={newRole}
                    onChange={(event) => setNewRole(event.target.value)}
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="signer">Người ký</option>
                    <option value="approver">Người phê duyệt</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleAddSigner} disabled={addSignerMutation.isPending || !newEmail || !newName} className="w-full">
            {addSignerMutation.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Đang thêm...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Thêm người ký
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500">
            Người ký nội bộ được chọn từ danh bạ user và sẽ nhận tác vụ ký trong hệ thống. Người ký bên ngoài vẫn dùng email và OTP.
          </p>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
