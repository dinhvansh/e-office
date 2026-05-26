"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { ArrowLeft, Download, Eye, FileDown, FileSearch, Paperclip, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { AuditLogRecord, DocumentAuditSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuditResponse = {
  logs: AuditLogRecord[];
  summary: DocumentAuditSummary;
};

const eventLabelMap: Record<string, string> = {
  "document.viewed": "Mở tài liệu",
  "document.downloaded": "Tải tài liệu",
  "document.signed_viewed": "Mở bản đã ký",
  "document.signed_downloaded": "Tải bản đã ký",
  "document.attachment_downloaded": "Tải file đính kèm",
};

const eventIconMap: Record<string, typeof Eye> = {
  "document.viewed": Eye,
  "document.downloaded": Download,
  "document.signed_viewed": FileSearch,
  "document.signed_downloaded": FileDown,
  "document.attachment_downloaded": Paperclip,
};

const statCards = (summary?: DocumentAuditSummary) => [
  {
    key: "views",
    label: "Lượt mở",
    value: summary?.totalViews ?? 0,
    icon: Eye,
  },
  {
    key: "downloads",
    label: "Lượt tải",
    value: summary?.totalDownloads ?? 0,
    icon: Download,
  },
  {
    key: "signedViews",
    label: "Mở bản đã ký",
    value: summary?.totalSignedViews ?? 0,
    icon: FileSearch,
  },
  {
    key: "signedDownloads",
    label: "Tải bản đã ký",
    value: summary?.totalSignedDownloads ?? 0,
    icon: FileDown,
  },
];

export default function AuditPage({ params }: { params: { documentId: string } }) {
  const { fetchJson } = useAuth();
  const router = useRouter();
  const documentId = Number(params.documentId);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", documentId],
    queryFn: async () => {
      return fetchJson<AuditResponse>(`/audit/${documentId}`);
    },
    enabled: Number.isFinite(documentId),
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Nhật ký tài liệu #{documentId}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi chi tiết ai đã mở, tải và tương tác với tài liệu này.
        </p>
        <Button variant="outline" onClick={() => router.push(`/documents/${documentId}/flow`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại flow
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards(data?.summary).map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl bg-slate-100 p-2">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thống kê theo người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Đang tải...</p>
          ) : data?.summary.viewers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Người dùng</th>
                    <th className="px-3 py-2 text-left font-medium">Mở</th>
                    <th className="px-3 py-2 text-left font-medium">Tải</th>
                    <th className="px-3 py-2 text-left font-medium">Mở bản ký</th>
                    <th className="px-3 py-2 text-left font-medium">Tải bản ký</th>
                    <th className="px-3 py-2 text-left font-medium">Tải đính kèm</th>
                    <th className="px-3 py-2 text-left font-medium">Hoạt động cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.viewers.map((viewer, index) => (
                    <tr key={`${viewer.user_id ?? "anon"}-${index}`} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">
                          {viewer.full_name || viewer.email || "Người dùng không xác định"}
                        </div>
                        <div className="text-xs text-slate-500">{viewer.email || `user_id: ${viewer.user_id ?? "-"}`}</div>
                      </td>
                      <td className="px-3 py-3">{viewer.views}</td>
                      <td className="px-3 py-3">{viewer.downloads}</td>
                      <td className="px-3 py-3">{viewer.signedViews}</td>
                      <td className="px-3 py-3">{viewer.signedDownloads}</td>
                      <td className="px-3 py-3">{viewer.attachmentDownloads}</td>
                      <td className="px-3 py-3 text-slate-500">
                        {viewer.lastActivityAt ? dayjs(viewer.lastActivityAt).format("DD/MM/YYYY HH:mm:ss") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Chưa có hoạt động xem/tải nào.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline chi tiết</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-500">Đang tải...</p>
          ) : data?.logs.length ? (
            data.logs.map((log) => {
              const Icon = eventIconMap[log.event || ""] || ShieldCheck;
              return (
                <div key={log.id} className="flex gap-3 rounded-xl border border-slate-100 px-4 py-3">
                  <div className="mt-0.5 rounded-lg bg-slate-100 p-2">
                    <Icon className="h-4 w-4 text-slate-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">
                        {eventLabelMap[log.event || ""] || log.event || "Sự kiện"}
                      </p>
                      <span className="text-xs text-slate-400">
                        {dayjs(log.created_at).format("DD/MM/YYYY HH:mm:ss")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {log.user?.full_name || log.user?.email || "Người dùng không xác định"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span>IP: {log.ip || "-"}</span>
                      <span>User-Agent: {log.ua || "-"}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">Chưa có log nào.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
