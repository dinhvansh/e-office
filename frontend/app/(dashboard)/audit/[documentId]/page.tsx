"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useAuth } from "@/components/providers/auth-provider";
import { AuditLogRecord } from "@/lib/types";

export default function AuditPage({ params }: { params: { documentId: string } }) {
  const { fetchJson } = useAuth();
  const documentId = Number(params.documentId);
  const { data, isLoading } = useQuery({
    queryKey: ["audit", documentId],
    queryFn: async () => {
      const payload = await fetchJson<{ logs: AuditLogRecord[] }>(`/audit/${documentId}`);
      return payload.logs;
    },
    enabled: Number.isFinite(documentId),
  });

  return (
    <section className="card">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">Audit log tai lieu #{documentId}</h2>
      {isLoading ? (
        <p className="text-sm text-slate-500">Dang tai...</p>
      ) : (
        <div className="space-y-3">
          {data?.map((log) => (
            <div key={log.id} className="rounded-xl border border-slate-100 px-4 py-3">
              <p className="font-medium text-slate-900">{log.event}</p>
              <p className="text-xs text-slate-500">{dayjs(log.created_at).format("DD/MM/YYYY HH:mm")}</p>
              <p className="text-xs text-slate-400">IP: {log.ip ?? "-"}</p>
            </div>
          ))}
          {data && data.length === 0 && <p className="text-sm text-slate-500">Chua co log nao.</p>}
        </div>
      )}
    </section>
  );
}
