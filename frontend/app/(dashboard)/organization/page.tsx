'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Building2, Briefcase, ChevronRight, Plus, Save, Search, Trash2, UserPlus, Users, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/components/providers/i18n-provider';
import { DashboardHeaderPortal } from '@/components/ui/dashboard-header-portal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComboboxSelect } from '@/components/ui/combobox-select';
import { useDestructiveConfirmation } from '@/components/providers/destructive-confirmation-provider';

type DepartmentNode = {
  id: number; name: string; code?: string | null; parent_id?: number | null; description?: string | null;
  manager_id?: number | null; manager?: Pick<Person, 'id' | 'email' | 'full_name'> | null;
  children?: DepartmentNode[]; _count?: { users: number; children?: number };
};
type Position = { id: number; code: string; name: string; level?: number | null; _count?: { users: number } };
type Role = { id: number; name: string; description?: string | null };
type Person = {
  id: number; email: string; full_name?: string | null; avatar_url?: string | null;
  status?: string | null;
  department_id?: number | null; manager_id?: number | null; position_id?: number | null;
  department?: { id: number; name: string } | null; position?: Position | null;
  manager?: Pick<Person, 'id' | 'email' | 'full_name'> | null;
};
type StructureData = {
  department: DepartmentNode & { users: Person[]; support_managers: Array<{ user_id: number; user: Person }>; parent?: { id: number; name: string } | null };
  available_users: Person[];
  positions: Position[];
};
type MemberDraft = { user_id: number; position_id: number | null; manager_id: number | null };
type Replacement = { department_id: number; outgoing_user_id: number; replacement_user_id: number };

const flatten = (nodes: DepartmentNode[], depth = 0): Array<DepartmentNode & { depth: number }> =>
  nodes.flatMap((node) => [{ ...node, depth }, ...flatten(node.children ?? [], depth + 1)]);
const displayName = (person?: Person | null) => person?.full_name || person?.email || '—';
const EMPTY_VALUE = '__none__';

function StyledSelect({ value, options, emptyLabel, disabled, onChange, compact = false, actionLabel, onAction }: {
  value: number | string | null;
  options: Array<{ value: number | string; label: string }>;
  emptyLabel: string;
  disabled?: boolean;
  onChange: (value: number | string | null) => void;
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const actionValue = '__action__';
  return <Select disabled={disabled} value={value === null || value === '' ? EMPTY_VALUE : String(value)} onValueChange={(next) => {
    if (next === actionValue) { onAction?.(); return; }
    onChange(next === EMPTY_VALUE ? null : (/^\d+$/.test(next) ? Number(next) : next));
  }}>
    <SelectTrigger className={compact ? 'h-9 bg-background' : 'mt-1 h-10 bg-background'}><SelectValue placeholder={emptyLabel} /></SelectTrigger>
    <SelectContent className="z-[100] max-h-72">
      <SelectItem value={EMPTY_VALUE}>{emptyLabel}</SelectItem>
      {options.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}
      {actionLabel && onAction && <SelectItem value={actionValue} className="mt-1 border-t pt-2 font-medium text-primary hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"><span className="flex items-center gap-2"><Plus className="h-4 w-4" />{actionLabel}</span></SelectItem>}
    </SelectContent>
  </Select>;
}

export default function OrganizationPage() {
  const { fetchJson, hasPermission, user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const confirmDestructive = useDestructiveConfirmation();
  const canEdit = hasPermission(['departments:update', 'users:update']);
  const canCreateDepartment = hasPermission('departments:create');
  const canDeleteDepartment = hasPermission('departments:delete');
  const canCreatePosition = hasPermission('positions:create');
  const canDeletePosition = hasPermission('positions:delete');
  const canCreateUser = hasPermission('users:create');
  const canDeleteUser = hasPermission('users:delete');
  const canReadRoles = hasPermission('roles:read');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [managerId, setManagerId] = useState<number | null>(null);
  const [supportIds, setSupportIds] = useState<number[]>([]);
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [personToAdd, setPersonToAdd] = useState<number | null>(null);
  const [replacementId, setReplacementId] = useState<number | null>(null);
  const [transferPerson, setTransferPerson] = useState<Person | null>(null);
  const [transferDepartmentId, setTransferDepartmentId] = useState<number | null>(null);
  const [transferReplacementId, setTransferReplacementId] = useState<number | null>(null);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [positionTarget, setPositionTarget] = useState<'organization' | 'person'>('organization');
  const [createPersonOpen, setCreatePersonOpen] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '', parent_id: '' });
  const [positionForm, setPositionForm] = useState({ name: '', code: '' });
  const [personForm, setPersonForm] = useState({ full_name: '', email: '', phone: '', password: '', position_id: '', manager_id: '', role_ids: [] as number[] });
  const [createdPeople, setCreatedPeople] = useState<Person[]>([]);
  const [draftSourceVersion, setDraftSourceVersion] = useState('');
  const [legacyManagerCount, setLegacyManagerCount] = useState(0);

  const treeQuery = useQuery({ queryKey: ['organization-tree'], queryFn: () => fetchJson<DepartmentNode[]>('/departments/tree') });
  const allDepartments = useMemo(() => flatten(treeQuery.data ?? []), [treeQuery.data]);
  const filteredDepartments = allDepartments.filter((department) => `${department.name} ${department.code ?? ''}`.toLowerCase().includes(departmentSearch.toLowerCase()));
  const activeDepartmentId = selectedId ?? allDepartments[0]?.id ?? null;

  const structureQuery = useQuery({
    queryKey: ['organization-structure', activeDepartmentId],
    enabled: activeDepartmentId !== null,
    queryFn: () => fetchJson<StructureData>(`/departments/${activeDepartmentId}/organization`),
  });
  const structure = structureQuery.data;
  const rolesQuery = useQuery({ queryKey: ['organization-roles'], enabled: canCreateUser && canReadRoles, queryFn: () => fetchJson<Role[]>('/roles') });
  const transferStructureQuery = useQuery({
    queryKey: ['organization-structure', transferDepartmentId],
    enabled: transferPerson !== null && transferDepartmentId !== null,
    queryFn: () => fetchJson<StructureData>(`/departments/${transferDepartmentId}/organization`),
  });

  const sourceVersion = structure ? JSON.stringify([
    structure.department.id,
    structure.department.manager_id,
    structure.department.support_managers.map((item) => item.user_id ?? item.user.id),
    structure.department.users.map((person) => [person.id, person.position_id, person.manager_id]),
  ]) : '';
  if (structure && sourceVersion !== draftSourceVersion) {
    const currentMemberIds = new Set(structure.department.users.map((person) => person.id));
    const sanitizedMembers = structure.department.users.map((person) => ({
      user_id: person.id,
      position_id: person.position_id ?? null,
      manager_id: person.manager_id && currentMemberIds.has(person.manager_id) ? person.manager_id : null,
    }));
    const invalidManagerCount = structure.department.users.filter((person) => person.manager_id && !currentMemberIds.has(person.manager_id)).length;
    setDraftSourceVersion(sourceVersion);
    setManagerId(structure.department.manager_id ?? null);
    setSupportIds(structure.department.support_managers.map((item) => item.user_id ?? item.user.id));
    setMembers(sanitizedMembers);
    setReplacements([]);
    setCreatedPeople([]);
    setLegacyManagerCount(invalidManagerCount);
    setDirty(invalidManagerCount > 0);
  }

  const peopleById = useMemo(() => new Map([...(structure?.available_users ?? []), ...createdPeople].map((person) => [person.id, person])), [createdPeople, structure]);
  const visibleMembers = members.filter((member) => {
    const person = peopleById.get(member.user_id);
    return `${person?.full_name ?? ''} ${person?.email ?? ''}`.toLowerCase().includes(memberSearch.toLowerCase());
  });
  const availableToAdd = structure?.available_users.filter((person) => !members.some((member) => member.user_id === person.id)) ?? [];
  const selectedPerson = personToAdd ? peopleById.get(personToAdd) : undefined;
  const oldManagedDepartment = selectedPerson?.department_id && selectedPerson.department_id !== activeDepartmentId
    ? allDepartments.find((department) => department.id === selectedPerson.department_id && department.manager_id === selectedPerson.id)
    : undefined;
  const replacementCandidates = oldManagedDepartment
    ? structure?.available_users.filter((person) => person.department_id === oldManagedDepartment.id && person.id !== selectedPerson?.id) ?? []
    : [];

  const saveMutation = useMutation({
    mutationFn: () => fetchJson(`/departments/${activeDepartmentId}/organization`, {
      method: 'PUT',
      body: JSON.stringify({ manager_id: managerId, support_manager_ids: supportIds, members, manager_replacements: replacements }),
    }),
    onSuccess: async () => {
      toast.success(t('organization.saved'));
      setDirty(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organization-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['organization-structure', activeDepartmentId] }),
        queryClient.invalidateQueries({ queryKey: ['departments-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['active-users'] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createDepartmentMutation = useMutation({
    mutationFn: () => fetchJson('/departments', { method: 'POST', body: JSON.stringify({ name: departmentForm.name, code: departmentForm.code || undefined, parent_id: departmentForm.parent_id ? Number(departmentForm.parent_id) : null }) }),
    onSuccess: async () => { toast.success(t('organization.departmentCreated')); setDepartmentOpen(false); setDepartmentForm({ name: '', code: '', parent_id: '' }); await queryClient.invalidateQueries({ queryKey: ['organization-tree'] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteDepartmentMutation = useMutation({
    mutationFn: (departmentId: number) => fetchJson(`/departments/${departmentId}`, { method: 'DELETE' }),
    onSuccess: async (_, deletedDepartmentId) => {
      const fallback = allDepartments.find((department) => department.id !== deletedDepartmentId)?.id ?? null;
      setSelectedId(fallback);
      toast.success(t('organization.departmentDeleted'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organization-tree'] }),
        queryClient.removeQueries({ queryKey: ['organization-structure', deletedDepartmentId] }),
        queryClient.invalidateQueries({ queryKey: ['departments-tree'] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const closePositionDialog = () => {
    const shouldReturnToPerson = positionTarget === 'person';
    setPositionOpen(false);
    setPositionTarget('organization');
    if (shouldReturnToPerson) setCreatePersonOpen(true);
  };
  const createPositionMutation = useMutation({
    mutationFn: () => fetchJson<Position>('/positions', { method: 'POST', body: JSON.stringify({ name: positionForm.name, code: positionForm.code }) }),
    onSuccess: async (position) => {
      if (positionTarget === 'person') setPersonForm((form) => ({ ...form, position_id: String(position.id) }));
      toast.success(t('organization.positionCreated'));
      closePositionDialog();
      setPositionForm({ name: '', code: '' });
      await queryClient.invalidateQueries({ queryKey: ['organization-structure', activeDepartmentId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deletePositionMutation = useMutation({
    mutationFn: (positionId: number) => fetchJson(`/positions/${positionId}`, { method: 'DELETE' }),
    onSuccess: async (_, deletedPositionId) => {
      if (personForm.position_id === String(deletedPositionId)) {
        setPersonForm((form) => ({ ...form, position_id: '' }));
      }
      toast.success(t('organization.positionDeleted'));
      await queryClient.invalidateQueries({ queryKey: ['organization-structure', activeDepartmentId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const createPersonMutation = useMutation({
    mutationFn: () => fetchJson<Person>('/users', {
      method: 'POST',
      body: JSON.stringify({
        full_name: personForm.full_name.trim(),
        email: personForm.email.trim().toLowerCase(),
        phone: personForm.phone.trim() || undefined,
        password: personForm.password,
        department_id: activeDepartmentId,
        position_id: Number(personForm.position_id),
        manager_id: personForm.manager_id ? Number(personForm.manager_id) : undefined,
        role_ids: personForm.role_ids.length ? personForm.role_ids : undefined,
      }),
    }),
    onSuccess: async (person) => {
      setCreatedPeople((current) => [...current.filter((item) => item.id !== person.id), person]);
      setMembers((current) => current.some((member) => member.user_id === person.id) ? current : [...current, {
        user_id: person.id,
        position_id: person.position_id ?? Number(personForm.position_id),
        manager_id: person.manager_id ?? (personForm.manager_id ? Number(personForm.manager_id) : null),
      }]);
      setPersonForm({ full_name: '', email: '', phone: '', password: '', position_id: '', manager_id: '', role_ids: [] });
      setCreatePersonOpen(false);
      toast.success(t('organization.personCreated'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organization-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['active-users'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deletePersonMutation = useMutation({
    mutationFn: (userId: number) => fetchJson(`/users/${userId}`, { method: 'DELETE' }),
    onSuccess: async (_, deletedUserId) => {
      setMembers((current) => current.filter((member) => member.user_id !== deletedUserId));
      setSupportIds((current) => current.filter((id) => id !== deletedUserId));
      if (managerId === deletedUserId) setManagerId(null);
      setCreatedPeople((current) => current.filter((person) => person.id !== deletedUserId));
      toast.success(t('organization.personDeleted'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organization-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['organization-structure', activeDepartmentId] }),
        queryClient.invalidateQueries({ queryKey: ['active-users'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deactivatePersonMutation = useMutation({
    mutationFn: (userId: number) => fetchJson(`/users/${userId}`, { method: 'PUT', body: JSON.stringify({ status: 'inactive' }) }),
    onSuccess: async (_, userId) => {
      setMembers((current) => current.filter((member) => member.user_id !== userId));
      setSupportIds((current) => current.filter((id) => id !== userId));
      toast.success(t('organization.personDeactivated'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organization-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['organization-structure'] }),
        queryClient.invalidateQueries({ queryKey: ['active-users'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const transferPersonMutation = useMutation({
    mutationFn: async () => {
      if (!transferPerson || !transferDepartmentId || !transferStructureQuery.data) throw new Error(t('organization.selectTargetDepartment'));
      const target = transferStructureQuery.data.department;
      const managedDepartment = allDepartments.find((department) => department.manager_id === transferPerson.id && department.id !== transferDepartmentId);
      if (managedDepartment && !transferReplacementId) throw new Error(t('organization.transferWarning'));
      return fetchJson(`/departments/${transferDepartmentId}/organization`, {
        method: 'PUT',
        body: JSON.stringify({
          manager_id: target.manager_id ?? null,
          support_manager_ids: target.support_managers.map((item) => item.user_id ?? item.user.id),
          members: [
            ...target.users.filter((person) => person.id !== transferPerson.id).map((person) => ({ user_id: person.id, position_id: person.position_id ?? null, manager_id: person.manager_id ?? null })),
            { user_id: transferPerson.id, position_id: transferPerson.position_id ?? null, manager_id: null },
          ],
          manager_replacements: managedDepartment && transferReplacementId ? [{ department_id: managedDepartment.id, outgoing_user_id: transferPerson.id, replacement_user_id: transferReplacementId }] : [],
        }),
      });
    },
    onSuccess: async () => {
      toast.success(t('organization.personTransferred'));
      setTransferPerson(null); setTransferDepartmentId(null); setTransferReplacementId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organization-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['organization-structure'] }),
        queryClient.invalidateQueries({ queryKey: ['active-users'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markDirty = () => setDirty(true);
  const updateMember = (userId: number, patch: Partial<MemberDraft>) => { setMembers((current) => current.map((member) => member.user_id === userId ? { ...member, ...patch } : member)); markDirty(); };
  const addMember = () => {
    if (!personToAdd) return;
    if (oldManagedDepartment && !replacementId) { toast.error(t('organization.transferWarning')); return; }
    setMembers((current) => [...current, { user_id: personToAdd, position_id: selectedPerson?.position_id ?? null, manager_id: null }]);
    if (oldManagedDepartment && replacementId) setReplacements((current) => [...current.filter((item) => item.department_id !== oldManagedDepartment.id), { department_id: oldManagedDepartment.id, outgoing_user_id: personToAdd, replacement_user_id: replacementId }]);
    setPersonToAdd(null); setReplacementId(null); setAddOpen(false); markDirty();
  };
  const requestDeleteDepartment = (department: DepartmentNode) => {
    if (department.id === activeDepartmentId && dirty) {
      toast.error(t('organization.saveBeforeDelete'));
      return;
    }
    confirmDestructive({
      title: t('organization.deleteDepartment'),
      targetName: department.name,
      description: t('organization.deleteDepartmentDescription'),
      confirmLabel: t('organization.deleteDepartment'),
      errorMessage: t('organization.deleteDepartmentFailed'),
    }, () => deleteDepartmentMutation.mutateAsync(department.id));
  };
  const requestDeletePosition = (position: Position) => {
    confirmDestructive({
      title: t('organization.deletePosition'),
      targetName: position.name,
      description: t('organization.deletePositionDescription'),
      confirmLabel: t('organization.deletePosition'),
      errorMessage: t('organization.deletePositionFailed'),
    }, () => deletePositionMutation.mutateAsync(position.id));
  };
  const requestDeletePerson = (person: Person) => {
    if (person.id === user?.id) {
      toast.error(t('organization.cannotDeleteSelf'));
      return;
    }
    confirmDestructive({
      title: t('organization.deletePerson'),
      targetName: displayName(person),
      description: t('organization.deletePersonDescription'),
      confirmLabel: t('organization.deletePerson'),
      errorMessage: t('organization.deletePersonFailed'),
    }, () => deletePersonMutation.mutateAsync(person.id));
  };
  const requestDeactivatePerson = (person: Person) => {
    if (person.id === user?.id) { toast.error(t('organization.cannotDeactivateSelf')); return; }
    confirmDestructive({
      title: t('organization.deactivatePerson'),
      targetName: displayName(person),
      description: t('organization.deactivatePersonDescription'),
      confirmLabel: t('organization.deactivatePerson'),
      errorMessage: t('organization.deactivatePersonFailed'),
    }, () => deactivatePersonMutation.mutateAsync(person.id));
  };
  const openTransferPerson = (person: Person) => {
    if (dirty) { toast.error(t('organization.saveBeforeTransfer')); return; }
    setTransferPerson(person);
    setTransferDepartmentId(null);
    setTransferReplacementId(null);
  };

  return <div className="space-y-5">
    <DashboardHeaderPortal icon={Building2} title={t('organization.title')} description={t('organization.description')} iconColor="text-cyan-600" />
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">{t('organization.oldScreensHint')}</div>
    <div className="grid min-h-[650px] gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="h-fit xl:sticky xl:top-4">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between"><CardTitle className="text-base">{t('organization.structure')}</CardTitle>{canCreateDepartment && <Button size="icon" variant="ghost" onClick={() => setDepartmentOpen(true)} aria-label={t('organization.addDepartment')}><Plus className="h-4 w-4" /></Button>}</div>
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={departmentSearch} onChange={(event) => setDepartmentSearch(event.target.value)} placeholder={t('organization.searchDepartment')} /></div>
        </CardHeader>
        <CardContent className="max-h-[68vh] space-y-1 overflow-y-auto px-3">
          {treeQuery.isLoading ? <Skeleton className="h-48" /> : filteredDepartments.map((department) => <div key={department.id} className={`group flex w-full items-center rounded-md text-sm transition ${activeDepartmentId === department.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}><button onClick={() => setSelectedId(department.id)} className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-1 text-left" style={{ paddingLeft: `${12 + department.depth * 18}px` }}><ChevronRight className="h-3.5 w-3.5 shrink-0" /><Building2 className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{department.name}</span><span className="text-xs opacity-70">{department._count?.users ?? 0}</span></button>{canDeleteDepartment && <Button size="icon" variant="ghost" className={`mr-1 h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${activeDepartmentId === department.id ? 'text-primary-foreground hover:bg-white/15 hover:text-primary-foreground' : 'text-destructive hover:bg-destructive/10 hover:text-destructive'}`} disabled={deleteDepartmentMutation.isPending} onClick={() => requestDeleteDepartment(department)} aria-label={t('organization.deleteDepartment')} title={t('organization.deleteDepartment')}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>)}
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-5">
        {!activeDepartmentId ? <Card><CardContent className="py-20 text-center text-muted-foreground">{t('organization.selectDepartment')}</CardContent></Card> : structureQuery.isLoading || !structure ? <Skeleton className="h-[600px]" /> : <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-muted-foreground">{t('organization.title')}</p><h2 className="text-2xl font-bold">{structure.department.name}</h2><Badge variant="secondary" className="mt-2">{t('organization.activeMembers', { count: members.length })}</Badge></div><div className="flex flex-wrap items-center gap-3">{dirty && <span className="text-sm text-amber-600">{t('organization.unsaved')}</span>}{canEdit && <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}><Save className="mr-2 h-4 w-4" />{saveMutation.isPending ? t('organization.saving') : t('organization.save')}</Button>}</div></div>
          {legacyManagerCount > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t('organization.legacyManagerWarning', { count: legacyManagerCount })}</div>}
          <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
            <Card><CardHeader><CardTitle className="text-base">{t('organization.general')}</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>{t('organization.code')}</Label><div className="mt-1 rounded-md border bg-muted/40 p-2 text-sm">{structure.department.code || '—'}</div></div><div><Label>{t('organization.parent')}</Label><div className="mt-1 rounded-md border bg-muted/40 p-2 text-sm">{structure.department.parent?.name || t('organization.root')}</div></div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">{t('organization.management')}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div><Label>{t('organization.manager')}</Label><StyledSelect disabled={!canEdit} value={managerId} emptyLabel={t('organization.noManager')} options={members.map((member) => ({ value: member.user_id, label: displayName(peopleById.get(member.user_id)) }))} onChange={(value) => { const next = typeof value === 'number' ? value : null; setManagerId(next); setSupportIds((ids) => ids.filter((id) => id !== next)); markDirty(); }} /></div><div><Label>{t('organization.supportManagers')} <span className="font-normal text-muted-foreground">({t('organization.supportHint')})</span></Label><div className="mt-1 max-h-28 space-y-1 overflow-y-auto rounded-md border p-2">{members.filter((member) => member.user_id !== managerId).map((member) => <label key={member.user_id} className="flex items-center gap-2 text-sm"><input disabled={!canEdit} type="checkbox" checked={supportIds.includes(member.user_id)} onChange={(event) => { setSupportIds((ids) => event.target.checked ? [...ids, member.user_id] : ids.filter((id) => id !== member.user_id)); markDirty(); }} />{displayName(peopleById.get(member.user_id))}</label>)}</div></div></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="gap-3 border-b sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">{t('organization.members')}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t('organization.activeMembers', { count: members.length })}</p></div><div className="flex flex-wrap gap-2">{canCreatePosition && <Button variant="outline" onClick={() => { setPositionTarget('organization'); setPositionOpen(true); }}><Briefcase className="mr-2 h-4 w-4" />{t('organization.managePositions')}</Button>}{canCreateUser && <Button onClick={() => setCreatePersonOpen(true)}><UserPlus className="mr-2 h-4 w-4" />{t('organization.createPerson')}</Button>}</div></CardHeader>
            <CardContent className="p-0">
              <div className="border-b p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder={t('organization.searchMember')} /></div></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/40 text-left"><tr><th className="p-3">{t('organization.person')}</th><th className="p-3">{t('organization.position')}</th><th className="p-3">{t('organization.directManager')}</th><th className="w-20 p-3 text-center">{t('organization.actions')}</th></tr></thead>
                <tbody>{visibleMembers.map((member) => { const person = peopleById.get(member.user_id); return <tr key={member.user_id} className="border-t">
                  <td className="p-3"><div className="font-medium">{displayName(person)}</div><div className="text-xs text-muted-foreground">{person?.email}</div>{managerId === member.user_id && <Badge className="mt-1">{t('organization.manager')}</Badge>}</td>
                  <td className="p-3"><StyledSelect compact disabled={!canEdit} value={member.position_id} emptyLabel={t('organization.noPosition')} options={structure.positions.map((position) => ({ value: position.id, label: position.name }))} onChange={(value) => updateMember(member.user_id, { position_id: typeof value === 'number' ? value : null })} /></td>
                  <td className="p-3"><StyledSelect compact disabled={!canEdit} value={member.manager_id} emptyLabel={t('organization.noManager')} options={members.filter((candidate) => candidate.user_id !== member.user_id).map((candidate) => ({ value: candidate.user_id, label: displayName(peopleById.get(candidate.user_id)) }))} onChange={(value) => updateMember(member.user_id, { manager_id: typeof value === 'number' ? value : null })} /></td>
                  <td className="p-3"><div className="flex items-center justify-center gap-1">{canEdit && <Button size="icon" variant="ghost" title={t('organization.transferPerson')} aria-label={t('organization.transferPerson')} onClick={() => person && openTransferPerson(person)}><ArrowRightLeft className="h-4 w-4 text-blue-600" /></Button>}{canEdit && <Button size="icon" variant="ghost" title={member.user_id === user?.id ? t('organization.cannotDeactivateSelf') : t('organization.deactivatePerson')} aria-label={t('organization.deactivatePerson')} disabled={deactivatePersonMutation.isPending || member.user_id === user?.id} onClick={() => person && requestDeactivatePerson(person)}><UserX className="h-4 w-4 text-orange-600" /></Button>}{canDeleteUser && <Button size="icon" variant="ghost" className="hover:bg-destructive/10" title={member.user_id === user?.id ? t('organization.cannotDeleteSelf') : t('organization.deletePerson')} aria-label={t('organization.deletePerson')} disabled={deletePersonMutation.isPending || member.user_id === user?.id} onClick={() => person && requestDeletePerson(person)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></td>
                </tr>; })}{!visibleMembers.length && <tr><td colSpan={4} className="p-12 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-8 w-8" />{t('organization.empty')}</td></tr>}</tbody>
              </table></div>
            </CardContent>
          </Card>
        </>}
      </div>
    </div>

    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>{t('organization.addMember')}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>{t('organization.availableMember')}</Label><ComboboxSelect className="mt-1" value={personToAdd ?? EMPTY_VALUE} placeholder={t('organization.selectMember')} searchPlaceholder={t('organization.searchMember')} emptyText={t('organization.empty')} options={availableToAdd.map((person) => ({ value: person.id, label: `${displayName(person)} (${person.department?.name || '—'})` }))} onChange={(value) => { setPersonToAdd(Number(value)); setReplacementId(null); }} /></div>{oldManagedDepartment && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p>{t('organization.transferWarning')}</p><Label className="mt-3 block">{t('organization.replacement')} — {oldManagedDepartment.name}</Label><StyledSelect value={replacementId} emptyLabel={t('organization.noManager')} options={replacementCandidates.map((person) => ({ value: person.id, label: displayName(person) }))} onChange={(value) => setReplacementId(typeof value === 'number' ? value : null)} /></div>}</div><DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>{t('organization.cancel')}</Button><Button onClick={addMember} disabled={!personToAdd}>{t('organization.add')}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={transferPerson !== null} onOpenChange={(open) => { if (!open) { setTransferPerson(null); setTransferDepartmentId(null); setTransferReplacementId(null); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('organization.transferPerson')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm font-medium">{transferPerson ? displayName(transferPerson) : ''}</p>
          <div><Label>{t('organization.targetDepartment')}</Label><StyledSelect value={transferDepartmentId} emptyLabel={t('organization.selectTargetDepartment')} options={allDepartments.filter((department) => department.id !== activeDepartmentId).map((department) => ({ value: department.id, label: department.name }))} onChange={(value) => { setTransferDepartmentId(typeof value === 'number' ? value : null); setTransferReplacementId(null); }} /></div>
          {transferPerson && allDepartments.some((department) => department.manager_id === transferPerson.id && department.id !== transferDepartmentId) && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p>{t('organization.transferWarning')}</p><Label className="mt-3 block">{t('organization.replacement')}</Label><StyledSelect value={transferReplacementId} emptyLabel={t('organization.noManager')} options={members.filter((member) => member.user_id !== transferPerson.id).map((member) => ({ value: member.user_id, label: displayName(peopleById.get(member.user_id)) }))} onChange={(value) => setTransferReplacementId(typeof value === 'number' ? value : null)} /></div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setTransferPerson(null)}>{t('organization.cancel')}</Button><Button disabled={!transferDepartmentId || transferStructureQuery.isLoading || transferPersonMutation.isPending} onClick={() => transferPersonMutation.mutate()}>{transferPersonMutation.isPending ? t('organization.saving') : t('organization.transfer')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={createPersonOpen} onOpenChange={setCreatePersonOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{t('organization.createPerson')}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-1 sm:grid-cols-2">
          <div><Label>{t('organization.fullName')} *</Label><Input className="mt-1" value={personForm.full_name} onChange={(event) => setPersonForm((form) => ({ ...form, full_name: event.target.value }))} /></div>
          <div><Label>{t('organization.email')} *</Label><Input className="mt-1" type="email" autoComplete="off" value={personForm.email} onChange={(event) => setPersonForm((form) => ({ ...form, email: event.target.value }))} /></div>
          <div><Label>{t('organization.phone')}</Label><Input className="mt-1" type="tel" value={personForm.phone} onChange={(event) => setPersonForm((form) => ({ ...form, phone: event.target.value }))} /></div>
          <div><Label>{t('organization.initialPassword')} *</Label><Input className="mt-1" type="password" autoComplete="new-password" value={personForm.password} onChange={(event) => setPersonForm((form) => ({ ...form, password: event.target.value }))} /><p className="mt-1 text-xs text-muted-foreground">{t('organization.passwordHint')}</p></div>
          <div><Label>{t('organization.position')} *</Label><StyledSelect value={personForm.position_id} emptyLabel={t('organization.noPosition')} options={(structure?.positions ?? []).map((position) => ({ value: position.id, label: position.name }))} onChange={(value) => setPersonForm((form) => ({ ...form, position_id: typeof value === 'number' ? String(value) : '' }))} actionLabel={canCreatePosition ? t('organization.createPositionInline') : undefined} onAction={canCreatePosition ? () => { setCreatePersonOpen(false); setPositionTarget('person'); setPositionOpen(true); } : undefined} /></div>
          <div><Label>{t('organization.directManager')}</Label><StyledSelect value={personForm.manager_id} emptyLabel={t('organization.noManager')} options={members.map((member) => ({ value: member.user_id, label: displayName(peopleById.get(member.user_id)) }))} onChange={(value) => setPersonForm((form) => ({ ...form, manager_id: typeof value === 'number' ? String(value) : '' }))} /></div>
          {canReadRoles && (rolesQuery.data?.length ?? 0) > 0 && <div className="sm:col-span-2"><Label>{t('organization.roles')}</Label><div className="mt-1 grid max-h-32 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">{rolesQuery.data?.map((role) => <label key={role.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={personForm.role_ids.includes(role.id)} onChange={(event) => setPersonForm((form) => ({ ...form, role_ids: event.target.checked ? [...form.role_ids, role.id] : form.role_ids.filter((id) => id !== role.id) }))} /><span>{role.name}</span></label>)}</div></div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setCreatePersonOpen(false)}>{t('organization.cancel')}</Button><Button disabled={!activeDepartmentId || !personForm.full_name.trim() || !personForm.email.trim() || personForm.password.length < 6 || !personForm.position_id || createPersonMutation.isPending} onClick={() => createPersonMutation.mutate()}>{createPersonMutation.isPending ? t('organization.saving') : t('organization.create')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={departmentOpen} onOpenChange={setDepartmentOpen}><DialogContent><DialogHeader><DialogTitle>{t('organization.createDepartment')}</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>{t('organization.departmentName')}</Label><Input value={departmentForm.name} onChange={(event) => setDepartmentForm((form) => ({ ...form, name: event.target.value }))} /></div><div><Label>{t('organization.code')}</Label><Input value={departmentForm.code} onChange={(event) => setDepartmentForm((form) => ({ ...form, code: event.target.value }))} /></div><div><Label>{t('organization.parent')}</Label><StyledSelect value={departmentForm.parent_id} emptyLabel={t('organization.root')} options={allDepartments.map((department) => ({ value: department.id, label: `${'—'.repeat(department.depth)} ${department.name}` }))} onChange={(value) => setDepartmentForm((form) => ({ ...form, parent_id: typeof value === 'number' ? String(value) : '' }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDepartmentOpen(false)}>{t('organization.cancel')}</Button><Button disabled={!departmentForm.name || createDepartmentMutation.isPending} onClick={() => createDepartmentMutation.mutate()}>{t('organization.create')}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={positionOpen} onOpenChange={(open) => open ? setPositionOpen(true) : closePositionDialog()}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{t('organization.managePositions')}</DialogTitle></DialogHeader><div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">{(structure?.positions ?? []).map((position) => <div key={position.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/60"><Briefcase className="h-4 w-4 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{position.name}</p><p className="text-xs text-muted-foreground">{position.code} · {t('organization.positionUsers', { count: position._count?.users ?? 0 })}</p></div>{canDeletePosition && <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={(position._count?.users ?? 0) > 0 || deletePositionMutation.isPending} onClick={() => requestDeletePosition(position)} aria-label={t('organization.deletePosition')} title={(position._count?.users ?? 0) > 0 ? t('organization.positionInUse') : t('organization.deletePosition')}><Trash2 className="h-4 w-4" /></Button>}</div>)}</div><div className="space-y-3 border-t pt-4"><p className="text-sm font-semibold">{t('organization.createPosition')}</p><div><Label>{t('organization.positionName')}</Label><Input value={positionForm.name} onChange={(event) => setPositionForm((form) => ({ ...form, name: event.target.value }))} /></div><div><Label>{t('organization.positionCode')}</Label><Input value={positionForm.code} onChange={(event) => setPositionForm((form) => ({ ...form, code: event.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={closePositionDialog}>{t('organization.cancel')}</Button><Button disabled={!positionForm.name || !positionForm.code || createPositionMutation.isPending} onClick={() => createPositionMutation.mutate()}>{t('organization.create')}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
