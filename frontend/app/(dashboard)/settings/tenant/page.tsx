"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { TenantProfile } from "@/lib/types";

export default function TenantSettingsPage() {
  const { fetchJson } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["tenant"],
    queryFn: async () => {
      const payload = await fetchJson<{ tenant: TenantProfile }>("/tenants/me");
      return payload.tenant;
    },
  });

  return (
    <section className="card space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Thong tin doanh nghiep</h2>
      {isLoading ? (
        <p className="text-sm text-slate-500">Dang tai...</p>
      ) : data ? (
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-slate-500">Ten:</span> {data.name}
          </p>
          <p>
            <span className="text-slate-500">Domain:</span> {data.domain ?? "-"}
          </p>
          <p>
            <span className="text-slate-500">Trang thai:</span> {data.status}
          </p>
          <p>
            <span className="text-slate-500">Goi:</span> {data.plan}
          </p>
        </div>
      ) : (
        <p className="text-sm text-red-500">Khong the tai tenant.</p>
      )}
      <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Giay phep on-prem</p>
        <p className="text-xs text-slate-500">Tat ca tinh nang on-prem se tu dong kiem tra trong license server.</p>
        <p className="mt-2 text-xs text-slate-500">TODO: them giao dien kich hoat license offline.</p>
      </div>
    </section>
  );
}
