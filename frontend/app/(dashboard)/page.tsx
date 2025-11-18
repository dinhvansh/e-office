"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAuth } from "@/components/providers/auth-provider";
import { DocumentRecord, TenantProfile } from "@/lib/types";

dayjs.extend(relativeTime);

export default function DashboardPage() {
  const { fetchJson } = useAuth();
  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const data = await fetchJson<{ documents: DocumentRecord[] }>("/documents");
      return data.documents;
    },
  });
  const { data: tenantProfile } = useQuery({
    queryKey: ["tenant-profile"],
    queryFn: async () => {
      const data = await fetchJson<{ tenant: TenantProfile }>("/tenants/me");
      return data.tenant;
    },
  });

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card border-0 bg-gradient-to-br from-white via-white to-blue-50 shadow-[0_25px_70px_rgba(37,99,235,0.12)]">
          <p className="text-sm text-slate-500">Tổng số tài liệu</p>
          <p className="mt-2 text-4xl font-semibold text-slate-900">{documents?.length ?? 0}</p>
          <p className="text-xs text-slate-400">Upload & lưu trữ an toàn</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Trạng thái tenant</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 capitalize">{tenantProfile?.status ?? "active"}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="chip uppercase tracking-wider text-brand-600">{tenantProfile?.plan ?? "-"}</span>
            <span>Tạo ngày {tenantProfile?.created_at ? dayjs(tenantProfile.created_at).format("DD/MM/YYYY") : "--"}</span>
          </div>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">License & usage</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">On-Prem Enterprise</p>
          <p className="text-xs text-slate-400">Giới hạn người dùng: {tenantProfile ? 100 : "--"} | tài liệu: 10,000</p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Tài liệu gần đây</h2>
              <p className="text-sm text-slate-500">Theo dõi phiên bản và trạng thái ký</p>
            </div>
            <span className="chip">{isLoading ? "Đang đồng bộ..." : `${documents?.length ?? 0} documents`}</span>
          </div>
          {isLoading ? (
            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
          ) : (
            <div className="space-y-3">
              {documents?.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100/80 bg-white/70 px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">#{doc.id} · {doc.status ?? "draft"}</p>
                    <p className="text-xs text-slate-500">{dayjs(doc.created_at).fromNow()}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Version {doc.version}</p>
                    <p>ID chủ: {doc.owner_id ?? "--"}</p>
                  </div>
                </div>
              ))}
              {documents && documents.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Chưa có tài liệu nào. Tải lên tài liệu đầu tiên để khởi động luồng ký!
                </div>
              )}
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold text-slate-900">Thông tin giấy phép</h2>
          <p className="text-sm text-slate-500">Tự động kiểm tra qua License server.</p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-inner">
              <span>Ngày hết hạn</span>
              <span className="font-semibold text-slate-900">31/12/2026</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-inner">
              <span>Người dùng tối đa</span>
              <span className="font-semibold text-slate-900">100</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-inner">
              <span>Tài liệu tối đa</span>
              <span className="font-semibold text-slate-900">10,000</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
