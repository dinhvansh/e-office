'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit, Trash2, Phone, Mail, User } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
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
import { MetricCard } from '@/components/ui/metric-card';

type ExternalOrg = {
  id: number;
  name: string;
  code: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  is_active: boolean;
  created_at: string;
};

const CATEGORIES = [
  { value: 'government', label: 'Cơ quan nhà nước', color: 'bg-blue-100 text-blue-700' },
  { value: 'supplier', label: 'Nhà cung cấp', color: 'bg-green-100 text-green-700' },
  { value: 'customer', label: 'Khách hàng', color: 'bg-purple-100 text-purple-700' },
  { value: 'partner', label: 'Đối tác', color: 'bg-orange-100 text-orange-700' },
];

export default function ExternalOrgsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ExternalOrg | null>(null);
  const queryClient = useQueryClient();
  const { fetchJson } = useAuth();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['external-orgs'],
    queryFn: () => fetchJson<ExternalOrg[]>('/external-orgs'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ExternalOrg>) => {
      console.log('Creating external org:', data);
      return fetchJson('/external-orgs', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: async () => {
      console.log('External org created successfully');
      setShowModal(false);
      toast.success('Tạo tổ chức thành công!');
      // Small delay to ensure backend has saved
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['external-orgs'] });
        console.log('Refetched external orgs');
      }, 300);
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<ExternalOrg> & { id: number }) =>
      fetchJson(`/external-orgs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-orgs'] });
      setShowModal(false);
      setEditingOrg(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/external-orgs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-orgs'] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      category: formData.get('category') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      contact_person: formData.get('contact_person') as string,
    };

    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCategoryLabel = (category: string | null) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>
        {cat.label}
      </span>
    ) : (
      <span className="text-gray-400">-</span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Tổ chức bên ngoài"
        description="Quản lý danh sách tổ chức, đối tác, nhà cung cấp"
        iconColor="text-cyan-600"
        actions={
          <Button onClick={() => { setEditingOrg(null); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm tổ chức
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          CATEGORIES.map((cat) => {
            const count = orgs.filter((o) => o.category === cat.value).length;
            return (
              <MetricCard
                key={cat.value}
                title={cat.label}
                value={count.toString()}
                icon={Building2}
              />
            );
          })
        )}
      </div>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách tổ chức</CardTitle>
          <CardDescription>Quản lý thông tin chi tiết các tổ chức bên ngoài</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : orgs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Chưa có tổ chức"
              description="Thêm tổ chức bên ngoài đầu tiên để bắt đầu quản lý"
              action={{
                label: "Thêm tổ chức",
                onClick: () => { setEditingOrg(null); setShowModal(true); }
              }}
            />
          ) : (
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Tổ chức</th>
                      <th className="px-4 py-3 text-left font-medium">Loại</th>
                      <th className="px-4 py-3 text-left font-medium">Liên hệ</th>
                      <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org) => (
                      <tr key={org.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-xs text-muted-foreground">{org.code || '-'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">{getCategoryLabel(org.category)}</td>
                        <td className="px-4 py-4">
                          <div className="space-y-1 text-xs">
                            {org.contact_person && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-3 w-3" />
                                {org.contact_person}
                              </div>
                            )}
                            {org.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {org.phone}
                              </div>
                            )}
                            {org.email && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {org.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditingOrg(org); setShowModal(true); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                if (confirm('Xóa tổ chức này?')) {
                                  deleteMutation.mutate(org.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open);
        if (!open) setEditingOrg(null);
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Sửa tổ chức' : 'Thêm tổ chức mới'}</DialogTitle>
            <DialogDescription>
              {editingOrg ? 'Cập nhật thông tin tổ chức' : 'Điền thông tin tổ chức bên ngoài'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Tên tổ chức *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingOrg?.name}
                  required
                  placeholder="Công ty ABC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Mã</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={editingOrg?.code || ''}
                  placeholder="ABC-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Loại</Label>
              <select
                id="category"
                name="category"
                defaultValue={editingOrg?.category || ''}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Chọn loại --</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                name="address"
                defaultValue={editingOrg?.address || ''}
                placeholder="123 Đường ABC, Quận 1"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingOrg?.phone || ''}
                  placeholder="0123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingOrg?.email || ''}
                  placeholder="contact@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Người liên hệ</Label>
              <Input
                id="contact_person"
                name="contact_person"
                defaultValue={editingOrg?.contact_person || ''}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingOrg(null);
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? 'Đang xử lý...'
                  : editingOrg ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
