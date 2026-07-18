"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  FileText,
  PenTool,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  Building2,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { useAuth } from "@/components/providers/auth-provider";
import { DocumentRecord, TenantProfile } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AsyncErrorState, AsyncStatus } from "@/components/ui/async-state";

dayjs.extend(relativeTime);

export default function DashboardPage() {
  const { fetchJson, hasPermission } = useAuth();

  const canReadDocuments = hasPermission("documents:read");
  const canReadApprovals = hasPermission("approvals:read");
  const canReadSignRequests = hasPermission("sign_requests:read");
  const canReadUsers = hasPermission("users:read");
  const canViewAnyMetric =
    canReadDocuments || canReadApprovals || canReadSignRequests || canReadUsers;

  const { data: documents, isLoading: isLoadingDocs, isError: isDocumentsError, error: documentsError, refetch: refetchDocuments } = useQuery({
    queryKey: ["documents"],
    enabled: canReadDocuments,
    queryFn: async () => {
      const data = await fetchJson<{ documents: DocumentRecord[] }>("/documents");
      return data.documents;
    },
  });

  const { data: tenantProfile, isLoading: isLoadingTenant, isError: isTenantError, error: tenantError, refetch: refetchTenant } = useQuery({
    queryKey: ["tenant-profile"],
    queryFn: async () => {
      const data = await fetchJson<{ tenant: TenantProfile }>("/tenants/me");
      return data.tenant;
    },
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats", canReadApprovals, canReadSignRequests, canReadUsers],
    enabled: canViewAnyMetric,
    queryFn: async () => {
      const [approvals, signRequests, users] = await Promise.all([
        canReadApprovals
          ? fetchJson<any>("/approvals").catch(() => ({ approvals: [] }))
          : Promise.resolve({ approvals: [] }),
        canReadSignRequests
          ? fetchJson<any>("/sign-requests").catch(() => ({ signRequests: [] }))
          : Promise.resolve({ signRequests: [] }),
        canReadUsers ? fetchJson<any>("/users").catch(() => ({ users: [] })) : Promise.resolve({ users: [] }),
      ]);

      const usersList = users.users || users || [];
      const approvalsList = approvals.approvals || approvals || [];
      const signRequestsList = signRequests.signRequests || signRequests || [];

      return {
        totalApprovals: Array.isArray(approvalsList) ? approvalsList.length : 0,
        pendingApprovals: Array.isArray(approvalsList)
          ? approvalsList.filter((item: any) => item.status === "pending").length
          : 0,
        totalSignRequests: Array.isArray(signRequestsList) ? signRequestsList.length : 0,
        totalUsers: Array.isArray(usersList) ? usersList.length : 0,
      };
    },
  });

  const totalDocs = canReadDocuments ? documents?.length ?? 0 : 0;
  const activeDocs = canReadDocuments ? documents?.filter((item) => item.status === "active").length ?? 0 : 0;
  const pendingDocs = canReadDocuments ? documents?.filter((item) => item.status === "pending").length ?? 0 : 0;
  const draftDocs = canReadDocuments ? documents?.filter((item) => item.status === "draft").length ?? 0 : 0;
  const recentDocs = canReadDocuments ? documents?.slice(0, 5) ?? [] : [];

  const documentStatusData = canReadDocuments
    ? [
        { name: "Đang hoạt động", value: activeDocs, color: "#10b981" },
        { name: "Chờ xử lý", value: pendingDocs, color: "#f59e0b" },
        { name: "Nháp", value: draftDocs, color: "#6b7280" },
      ].filter((item) => item.value > 0)
    : [];

  const activityData = [
    { name: "Tài liệu", value: totalDocs },
    { name: "Phê duyệt", value: canReadApprovals ? stats?.totalApprovals ?? 0 : 0 },
    { name: "Yêu cầu ký", value: canReadSignRequests ? stats?.totalSignRequests ?? 0 : 0 },
    { name: "Người dùng", value: canReadUsers ? stats?.totalUsers ?? 0 : 0 },
  ].filter((item) => item.value > 0 || canViewAnyMetric);

  if (isDocumentsError || isTenantError) {
    return <div className="space-y-3 p-3 md:space-y-6 md:p-6"><PageHeader icon={TrendingUp} title="Tổng quan" description="Số liệu hệ thống" iconColor="text-blue-600" /><AsyncErrorState message="Không thể tải tổng quan. Vui lòng thử lại." onRetry={() => { void refetchDocuments(); void refetchTenant(); }} /></div>;
  }

  return (
    <div className="space-y-3 p-3 md:space-y-6 md:p-6">
      <PageHeader
        icon={TrendingUp}
        title="Tổng quan"
        description="Số liệu hệ thống và hoạt động gần đây theo quyền hiện có"
        iconColor="text-blue-600"
      />
      <AsyncStatus message={isLoadingDocs || isLoadingStats || isLoadingTenant ? 'Đang tải tổng quan...' : isDocumentsError || isTenantError ? 'Không thể tải tổng quan.' : 'Tổng quan đã tải.'} />

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
              value={String(totalDocs)}
              icon={FileText}
              iconColor="text-blue-600"
              description={canReadDocuments ? `${activeDocs} đang hoạt động` : "Không có quyền xem"}
            />
            <MetricCard
              title="Đang hoạt động"
              value={String(activeDocs)}
              icon={CheckCircle}
              iconColor="text-green-600"
              description={canReadDocuments ? `${totalDocs} tổng số` : "Không có quyền xem"}
            />
            <MetricCard
              title="Chờ xử lý"
              value={String(pendingDocs + (canReadApprovals ? stats?.pendingApprovals ?? 0 : 0))}
              icon={Clock}
              iconColor="text-amber-600"
              description={canReadApprovals ? `${stats?.pendingApprovals ?? 0} phê duyệt` : "Không có quyền xem"}
            />
            <MetricCard
              title="Quy trình ký"
              value={String(canReadSignRequests ? stats?.totalSignRequests ?? 0 : 0)}
              icon={PenTool}
              iconColor="text-purple-600"
              description={canReadSignRequests ? "Yêu cầu ký điện tử" : "Không có quyền xem"}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Trạng thái tài liệu</CardTitle>
            <CardDescription className="text-xs md:text-sm">Phân bố theo trạng thái</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoadingDocs ? (
              <Skeleton className="h-48 w-full md:h-64" />
            ) : !canReadDocuments ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground md:h-64">
                <p className="text-sm">Không có quyền xem thống kê tài liệu</p>
              </div>
            ) : documentStatusData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground md:h-64">
                <p className="text-sm">Chưa có dữ liệu</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200} className="md:h-[250px]">
                <PieChart>
                  <Pie
                    data={documentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={typeof window !== "undefined" && window.innerWidth < 768 ? 50 : 80}
                    dataKey="value"
                  >
                    {documentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Tổng quan hoạt động</CardTitle>
            <CardDescription className="text-xs md:text-sm">Số lượng theo loại</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoadingDocs || isLoadingStats ? (
              <Skeleton className="h-48 w-full md:h-64" />
            ) : !canViewAnyMetric ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground md:h-64">
                <p className="text-sm">Không có quyền xem dữ liệu tổng quan</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200} className="md:h-[250px]">
                <BarChart data={activityData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base md:text-lg">Tài liệu gần đây</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Hoạt động mới nhất trong hệ thống
                </CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit">
                {canReadDocuments ? `${totalDocs} tài liệu` : "Ẩn theo quyền"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoadingDocs ? (
              <div className="space-y-2 md:space-y-3">
                <Skeleton className="h-14 w-full md:h-16" />
                <Skeleton className="h-14 w-full md:h-16" />
                <Skeleton className="h-14 w-full md:h-16" />
              </div>
            ) : !canReadDocuments ? (
              <div className="py-6 text-center text-muted-foreground md:py-8">
                <FileText className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50 md:mb-3 md:h-12 md:w-12" />
                <p className="text-sm font-medium md:text-base">Không có quyền xem tài liệu</p>
                <p className="text-xs md:text-sm">Danh sách gần đây chỉ hiện khi tài khoản có quyền đọc tài liệu.</p>
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground md:py-8">
                <FileText className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50 md:mb-3 md:h-12 md:w-12" />
                <p className="text-sm font-medium md:text-base">Chưa có tài liệu</p>
                <p className="text-xs md:text-sm">Tải lên tài liệu đầu tiên để bắt đầu</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-2 transition-colors hover:bg-muted/50 md:p-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
                      <div className="rounded-lg bg-primary/10 p-1.5 md:p-2">
                        <FileText className="h-3.5 w-3.5 text-primary md:h-4 md:w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium md:text-sm">
                          {doc.original_file_name || doc.title || `Document #${doc.id}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground md:text-xs">
                          {dayjs(doc.created_at).fromNow()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
                      <Badge variant="outline" className="text-[10px] md:text-xs">
                        {doc.status ?? "draft"}
                      </Badge>
                      <span className="hidden text-[10px] text-muted-foreground sm:inline md:text-xs">
                        v{doc.version}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base">Thông tin hệ thống</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4 md:space-y-3">
              {isLoadingTenant || isLoadingStats ? (
                <>
                  <Skeleton className="h-10 w-full md:h-12" />
                  <Skeleton className="h-10 w-full md:h-12" />
                  <Skeleton className="h-10 w-full md:h-12" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 md:p-3">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm">Tổ chức</span>
                    </div>
                    <span className="ml-2 truncate text-xs font-medium md:text-sm">
                      {tenantProfile?.name ?? "Acme Corp"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 md:p-3">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Users className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm">Người dùng</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {canReadUsers ? stats?.totalUsers ?? 0 : 0} users
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 md:p-3">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Shield className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm">Trạng thái</span>
                    </div>
                    <Badge variant="default" className="text-xs capitalize">
                      {tenantProfile?.status ?? "active"}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base">Thống kê nhanh</CardTitle>
              <CardDescription className="text-[10px] md:text-xs">
                Hoạt động trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pb-4 md:space-y-3">
              {isLoadingStats ? (
                <>
                  <Skeleton className="h-10 w-full md:h-12" />
                  <Skeleton className="h-10 w-full md:h-12" />
                  <Skeleton className="h-10 w-full md:h-12" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-2 md:p-3">
                    <span className="text-xs text-blue-900 md:text-sm">Tài liệu</span>
                    <span className="text-xs font-semibold text-blue-900 md:text-sm">{totalDocs}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 p-2 md:p-3">
                    <span className="text-xs text-green-900 md:text-sm">Phê duyệt</span>
                    <span className="text-xs font-semibold text-green-900 md:text-sm">
                      {canReadApprovals ? stats?.totalApprovals ?? 0 : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-purple-100 bg-purple-50 p-2 md:p-3">
                    <span className="text-xs text-purple-900 md:text-sm">Yêu cầu ký</span>
                    <span className="text-xs font-semibold text-purple-900 md:text-sm">
                      {canReadSignRequests ? stats?.totalSignRequests ?? 0 : 0}
                    </span>
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
