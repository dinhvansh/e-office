'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardHeaderPortal as PageHeader } from '@/components/ui/dashboard-header-portal';
import { CreditCard } from 'lucide-react';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={CreditCard}
        title="Gói dịch vụ"
        description="Mục license/billing đang được ẩn tạm trong bản triển khai này."
        iconColor="text-emerald-600"
      />
      <Card>
        <CardHeader>
          <CardTitle>Tạm thời không hiển thị</CardTitle>
          <CardDescription>
            Khi cần bật lại license/billing, chỉ cần mở lại menu và đặt `DISABLE_LICENSE_CHECK=false`.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Hệ thống hiện hoạt động ở chế độ không kiểm tra license để phục vụ demo/nội bộ.
        </CardContent>
      </Card>
    </div>
  );
}
