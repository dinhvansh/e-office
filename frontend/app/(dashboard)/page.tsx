"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { FileText, PenTool, Clock, CheckCircle, TrendingUp, Users, Building2, Shield } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { DocumentRecord, TenantProfile } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusTag } from "@/components/ui/status-tag";

dayjs.extend(relativeTime);

export default function DashboardPage() {
  const { fetchJson } = useAuth();
  
  const { data: documents, isLoading: isLoadingDocs } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const data = await fetchJson<{ documents: DocumentRecord[] }>("/documents");
      return data.documents;
    },
  });

  const { data: tenantProfile, isLoading: isLoadingTenant } = useQuery({
    queryKey: ["tenant-profile"],
    queryFn: async () => {
      const data = await fetchJson<{ tenant: TenantProfile }>("/tenants/me");
      return data.tenant;
    },
  });

  // Calculate stats
  const totalDocs = documents?.length ?? 0;
  const activeDocs = documents?.filter(d => d.status === 'active')?.length ?? 0;
  const pendingDocs = documents?.filter(d => d.status === 'pending')?.length ?? 0;
  const recentDocs = documents?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Dashboard"
        description="Tổng quan hệ thống và hoạt động gần đây"
        iconColor="text-blue-600"
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoadingDocs ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <MetricCard
              title="Tổng tài liệu"
              value={totalDocs.toString()}
              icon={FileText}
              iconColor="text-purple-600"
              trend={{ value: 12, isPositive: true }}
            />
            <MetricCard
              title="Đang hoạt động"
              value={activeDocs.toString()}
              icon={CheckCircle}
              iconColor="text-green-600"
              trend={{ value: 8, isPositive: true }}
            />
            <MetricCard
              title="Chờ xử lý"
              value={pendingDocs.toString()}
              icon={Clock}
              iconColor="text-amber-600"
            />
            <MetricCard
              title="Quy trình ký"
              value="0"
              icon={PenTool}
              iconColor="text-blue-600"
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Documents - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tài liệu gần đây</CardTitle>
                <CardDescription>Hoạt động mới nhất trong hệ thống</CardDescription>
              </div>
              <Badge variant="secondary">{totalDocs} tài liệu</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingDocs ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">Chưa có tài liệu</p>
                <p className="text-sm">Tải lên tài liệu đầu tiên để bắt đầu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {(doc.original_file_name || doc.title || `Document #${doc.id}`).substring(0, 30)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dayjs(doc.created_at).fromNow()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusTag 
                        status={doc.status ?? "draft"} 
                        variant={doc.status === "active" ? "success" : "default"}
                      />
                      <span className="text-xs text-muted-foreground">v{doc.version}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Info - 1 column */}
        <div className="space-y-6">
          {/* Tenant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin hệ thống</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingTenant ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Trạng thái</span>
                    </div>
                    <Badge variant="default" className="capitalize">
                      {tenantProfile?.status ?? "active"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Gói dịch vụ</span>
                    </div>
                    <Badge variant="secondary">
                      {tenantProfile?.plan ?? "Enterprise"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Ngày tạo</span>
                    </div>
                    <span className="text-sm font-medium">
                      {tenantProfile?.created_at 
                        ? dayjs(tenantProfile.created_at).format("DD/MM/YYYY")
                        : "--"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* License Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Giấy phép</CardTitle>
              <CardDescription className="text-xs">
                On-Premise Enterprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Hết hạn</span>
                <span className="text-sm font-semibold">31/12/2026</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Users</span>
                <span className="text-sm font-semibold">100</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Documents</span>
                <span className="text-sm font-semibold">10,000</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
