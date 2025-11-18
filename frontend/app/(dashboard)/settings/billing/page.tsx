"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { TenantProfile } from "@/lib/types";

export default function BillingSettingsPage() {
  const { fetchJson } = useAuth();
  const { data } = useQuery({
    queryKey: ["tenant"],
    queryFn: async () => {
      const payload = await fetchJson<{ tenant: TenantProfile }>("/tenants/me");
      return payload.tenant;
    },
  });

  return (
    <section className="card space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Goi va su dung</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-sm text-slate-500">Goi hien tai</p>
          <p className="text-2xl font-semibold text-slate-900">{data?.plan ?? "--"}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Trang thai</p>
          <p className="text-2xl font-semibold text-slate-900">{data?.status ?? "--"}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Tai lieu da dung</p>
          <p className="text-2xl font-semibold text-slate-900">Theo license server</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-sm text-slate-600">
          TODO: Tich hop Stripe/Momo de thanh toan goi SaaS theo roadmap Phase 3.
        </p>
      </div>
    </section>
  );
}
