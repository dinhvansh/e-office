"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { DestructiveConfirmationDialog } from "@/components/ui/destructive-confirmation-dialog";
import { formatDateTime } from "@/lib/locale-format";
import { getDocumentStatusMeta } from "@/lib/status-localization";

type Item = {
  id: number;
  title: string | null;
  document_number: string | null;
  previous_status: string | null;
  archived_at: string | null;
  archived_by: number | null;
  sign_request?: { id: number } | null;
};

export default function ArchivePage() {
  const { fetchJson, hasPermission } = useAuth();
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const archiveQuery = useQuery({
    queryKey: ["archive", search],
    enabled: hasPermission("archive:view"),
    queryFn: () => fetchJson<{ documents: Item[] }>(`/archive/documents${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });
  const restoreMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/archive/documents/${id}/restore`, { method: "POST" }),
    onSuccess: () => {
      toast.success(t("archive.restore.success"));
      queryClient.invalidateQueries({ queryKey: ["archive"] });
      setSelected(null);
    },
    onError: () => toast.error(t("archive.restore.error")),
  });

  return (
    <div className="space-y-6">
      <PageHeader icon={Archive} title={t("archive.title")} description={t("archive.description")} />
      <Card>
        <CardContent className="space-y-4 p-4">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("archive.searchPlaceholder")} />
          {!archiveQuery.data?.documents.length ? (
            <EmptyState icon={Archive} title={t("archive.emptyTitle")} description={t("archive.emptyDescription")} />
          ) : archiveQuery.data.documents.map((document) => (
            <div className="flex justify-between rounded border p-3" key={document.id}>
              <div>
                <b>{document.document_number || `#${document.id}`} · {document.title || t("common.untitled")}</b>
                <p className="text-sm text-slate-500">
                  {t("archive.previousStatus")}: {getDocumentStatusMeta(document.previous_status, t).label}
                  {" · "}{t("archive.archivedAt")}: {document.archived_at ? formatDateTime(document.archived_at, locale) : "—"}
                  {" · "}{t("archive.request")}: {document.sign_request?.id || "—"}
                </p>
              </div>
              {hasPermission("archive:restore") && (
                <Button variant="outline" disabled={restoreMutation.isPending} onClick={() => setSelected(document)}>
                  <RotateCcw className="mr-2 h-4 w-4" />{t("common.restore")}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <DestructiveConfirmationDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={t("archive.restore.title")}
        targetName={selected?.title || t("archive.restore.target")}
        description={t("archive.restore.description")}
        confirmLabel={t("common.restore")}
        destructive={false}
        onConfirm={() => restoreMutation.mutateAsync(selected!.id)}
      />
    </div>
  );
}
