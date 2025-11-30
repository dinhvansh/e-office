"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { FileText, PenTool, Clock, CheckCircle, TrendingUp, Users, Building2, Shield } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
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

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [approvals, signRequests, users] = await Promise.all([
        fetchJson<any>("/approvals").catch(() => ({ approvals: [] })),
        fetchJson<any>("/sign-requests").catch(() => ({ signRequests: [] })),
        fetchJson<any>("/users").catch(() => ({ users: [] }))
      ]);
      
      // Handle different response formats
      const usersList = users.users || users || [];
      const approvalsList = approvals.approvals || approvals || [];
      const signRequestsList = signRequests.signRequests || signRequests || [];
      
      return {
        totalApprovals: Array.isArray(approvalsList) ? approvalsList.length : 0,
        pendingApprovals: Array.isArray(approvalsList) ? approvalsList.filter((a: any) => a.status === 'pending')?.length : 0,
        totalSignRequests: Array.isArray(signRequestsList) ? signRequestsList.length : 0,
        totalUsers: Array.isArray(usersList) ? usersList.length : 0
      };
    },
  });

  // Calculate stats
  const totalDocs = documents?.length ?? 0;
  const activeDocs = documents?.filter(d => d.status === 'active')?.length ?? 0;
  const pendingDocs = documents?.filter(d => d.status === 'pending')?.length ?? 0;
  const draftDocs = documents?.filter(d => d.status === 'draft')?.length ?? 0;
  const recentDocs = documents?.slice(0, 5) ?? [];

  // Chart data
  const documentStatusData = [
    { name: 'Đang hoạt động', value: activeDocs, color: '#10b981' },
    { name: 'Chờ xử lý', value: pendingDocs, color: '#f59e0b' },
    { name: 'Nháp', value: draftDocs, color: '#6b7280' }
  ].filter(item => item.value > 0);

  const activityData = [
    { name: 'Tài liệu', value: totalDocs },
    { name: 'Phê duyệt', value: stats?.totalApprovals ?? 0 },
    { name: 'Yêu cầu ký', value: stats?.totalSignRequests ?? 0 },
    { name: 'Người dùng', value: stats?.totalUsers ?? 0 }
  ];

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <PageHeader
        icon={TrendingUp}
        title="Dashboard"
        description="Tổng quan hệ thống và hoạt động gần đây"
        iconColor="text-blue-600"
      />

      {/* Metrics Grid - Mobile optimized */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
        {isLoadingDocs || isLoadingStats ? (
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
              iconColor="text-blue-600"
              description={`${activeDocs} đang hoạt động`}
            />
            <MetricCard
              title="Đang hoạt động"
              value={activeDocs.toString()}
              icon={CheckCircle}
              iconColor="text-green-600"
              description={`${totalDocs} tổng số`}
            />
            <MetricCard
              title="Chờ xử lý"
              value={(pendingDocs + (stats?.pendingApprovals ?? 0)).toString()}
              icon={Clock}
              iconColor="text-amber-600"
              description={`${stats?.pendingApprovals ?? 0} phê duyệt`}
            />
            <MetricCard
              title="Quy trình ký"
              value={(stats?.totalSignRequests ?? 0).toString()}
              icon={PenTool}
              iconColor="text-purple-600"
              description="Yêu cầu ký điện tử"
            />
          </>
        )}
      </div>

      {/* Charts Row - Mobile optimized */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Document Status Pie Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Trạng thái tài liệu</CardTitle>
            <CardDescription className="text-xs md:text-sm">Phân bố theo trạng thái</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoadingDocs ? (
              <Skeleton className="h-48 md:h-64 w-full" />
            ) : documentStatusData.length === 0 ? (
              <div className="h-48 md:h-64 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Chưa có dữ liệu</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={documentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={window.innerWidth < 768 ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {documentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Activity Bar Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Tổng quan hoạt động</CardTitle>
            <CardDescription className="text-xs md:text-sm">Số lượng theo loại</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoadingDocs || isLoadingStats ? (
              <Skeleton className="h-48 md:h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activityData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid - Mobile optimized */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent Documents - 2 columns on desktop, full width on mobile */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base md:text-lg">Tài liệu gần đây</CardTitle>
                <CardDescription className="text-xs md:text-sm">Hoạt động mới nhất trong hệ thống</CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit">{totalDocs} tài liệu</Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoadingDocs ? (
              <div className="space-y-2 md:space-y-3">
                <Skeleton className="h-14 md:h-16 w-full" />
                <Skeleton className="h-14 md:h-16 w-full" />
                <Skeleton className="h-14 md:h-16 w-full" />
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <FileText className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 text-muted-foreground/50" />
                <p className="font-medium text-sm md:text-base">Chưa có tài liệu</p>
                <p className="text-xs md:text-sm">Tải lên tài liệu đầu tiên để bắt đầu</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 md:p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                      <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs md:text-sm truncate">
                          {(doc.original_file_name || doc.title || `Document #${doc.id}`).substring(0, 30)}...
                        </p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          {dayjs(doc.created_at).fromNow()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      <StatusTag 
                        status={doc.status ?? "draft"} 
                        variant={doc.status === "active" ? "success" : "default"}
                      />
                      <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:inline">v{doc.version}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Info - 1 column, full width on mobile */}
        <div className="space-y-4 md:space-y-6">
          {/* Tenant Info - Mobile optimized */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base">Thông tin hệ thống</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 md:space-y-3 pb-4">
              {isLoadingTenant || isLoadingStats ? (
                <>
                  <Skeleton className="h-10 md:h-12 w-full" />
                  <Skeleton className="h-10 md:h-12 w-full" />
                  <Skeleton className="h-10 md:h-12 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm">Tổ chức</span>
                    </div>
                    <span className="text-xs md:text-sm font-medium truncate ml-2">
                      {tenantProfile?.name ?? "Acme Corp"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm">Người dùng</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stats?.totalUsers ?? 0} users
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm">Trạng thái</span>
                    </div>
                    <Badge variant="default" className="capitalize text-xs">
                      {tenantProfile?.status ?? "active"}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats - Mobile optimized */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base">Thống kê nhanh</CardTitle>
              <CardDescription className="text-[10px] md:text-xs">
                Hoạt động trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 md:space-y-3 pb-4">
              {isLoadingStats ? (
                <>
                  <Skeleton className="h-10 md:h-12 w-full" />
                  <Skeleton className="h-10 md:h-12 w-full" />
                  <Skeleton className="h-10 md:h-12 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-xs md:text-sm text-blue-900">Tài liệu</span>
                    <span className="text-xs md:text-sm font-semibold text-blue-900">{totalDocs}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-xs md:text-sm text-green-900">Phê duyệt</span>
                    <span className="text-xs md:text-sm font-semibold text-green-900">{stats?.totalApprovals ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-xs md:text-sm text-purple-900">Yêu cầu ký</span>
                    <span className="text-xs md:text-sm font-semibold text-purple-900">{stats?.totalSignRequests ?? 0}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
