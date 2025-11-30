'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { TenantProfile } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Shield, Calendar, Users, HardDrive, CheckCircle, Edit, Key } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export default function TenantSettingsPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', domain: '' });
  const [licenseKey, setLicenseKey] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => {
      const payload = await fetchJson<{ tenant: TenantProfile }>('/tenants/me');
      return payload.tenant;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['tenant-stats'],
    queryFn: async () => {
      const payload = await fetchJson<{ stats: any }>('/tenants/me/stats');
      return payload.stats;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; domain?: string }) =>
      fetchJson('/tenants/me', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Cập nhật thông tin thành công!');
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      setShowEditDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra');
    },
  });

  const handleEdit = () => {
    if (data) {
      setEditForm({ name: data.name, domain: data.domain ?? '' });
      setShowEditDialog(true);
    }
  };

  const handleSubmitEdit = () => {
    updateMutation.mutate(editForm);
  };

  const handleActivateLicense = () => {
    // TODO: Implement license activation
    toast.info('Tính năng đang phát triển');
    setShowLicenseDialog(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-700', label: 'Hoạt động' },
      suspended: { color: 'bg-yellow-100 text-yellow-700', label: 'Tạm ngưng' },
      inactive: { color: 'bg-gray-100 text-gray-700', label: 'Không hoạt động' },
    };
    const variant = variants[status] || variants.active;
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      'on-prem-enterprise': { color: 'bg-purple-100 text-purple-700', label: 'On-Premise Enterprise' },
      'saas-starter': { color: 'bg-blue-100 text-blue-700', label: 'SaaS Starter' },
      'saas-professional': { color: 'bg-indigo-100 text-indigo-700', label: 'SaaS Professional' },
      'saas-enterprise': { color: 'bg-violet-100 text-violet-700', label: 'SaaS Enterprise' },
    };
    const variant = variants[plan] || { color: 'bg-gray-100 text-gray-700', label: plan };
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-500">Không thể tải thông tin doanh nghiệp</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Thông tin Doanh nghiệp"
        description="Quản lý thông tin và cấu hình tổ chức"
        iconColor="text-blue-600"
        actions={
          <Button onClick={handleEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Chỉnh sửa
          </Button>
        }
      />

      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{data.name}</CardTitle>
              <CardDescription className="mt-1">
                {data.domain || 'Chưa cấu hình domain'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(data.status)}
              {getPlanBadge(data.plan)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Người dùng</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {stats?.users?.active || 0}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Đang hoạt động / {stats?.users?.total || 0} tổng
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <HardDrive className="w-5 h-5" />
                <span className="text-sm font-medium">Dung lượng</span>
              </div>
              <div className="text-2xl font-bold text-green-900">Unlimited</div>
              <div className="text-xs text-green-600 mt-1">On-Premise</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">Ngày tạo</span>
              </div>
              <div className="text-lg font-bold text-purple-900">
                {data.created_at ? dayjs(data.created_at).format('DD/MM/YYYY') : '-'}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {data.created_at ? dayjs(data.created_at).fromNow() : '-'}
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Bảo mật</span>
              </div>
              <div className="flex items-center gap-1 text-orange-900">
                <CheckCircle className="w-5 h-5" />
                <span className="text-lg font-bold">Cao</span>
              </div>
              <div className="text-xs text-orange-600 mt-1">SSL/TLS</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Card */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-600" />
                Giấy phép On-Premise
              </CardTitle>
              <CardDescription className="mt-1">
                Quản lý license và kích hoạt offline
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => setShowLicenseDialog(true)}>
              <Key className="w-4 h-4 mr-2" />
              Kích hoạt License
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <div className="text-sm text-gray-500">Loại License</div>
              <div className="text-lg font-bold text-purple-900">Enterprise</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <div className="text-sm text-gray-500">Trạng thái</div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-lg font-bold text-green-900">Hợp lệ</span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <div className="text-sm text-gray-500">Hạn sử dụng</div>
              <div className="text-lg font-bold text-purple-900">Vĩnh viễn</div>
            </div>
          </div>

          <div className="bg-purple-100 rounded-lg p-4">
            <p className="text-sm text-purple-900">
              <strong>Lưu ý:</strong> Tất cả tính năng on-premise sẽ tự động kiểm tra qua license server.
              Bạn có thể kích hoạt license offline nếu không có kết nối internet.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin doanh nghiệp của bạn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Tên doanh nghiệp *</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="VD: Công ty ABC"
              />
            </div>
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={editForm.domain}
                onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                placeholder="VD: abc.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* License Activation Dialog */}
      <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kích hoạt License Offline</DialogTitle>
            <DialogDescription>
              Nhập license key để kích hoạt hệ thống offline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="license">License Key *</Label>
              <Input
                id="license"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nhập license key bạn nhận được từ nhà cung cấp
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLicenseDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleActivateLicense} disabled={!licenseKey}>
              Kích hoạt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
