'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FilePlus2, Files, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';

type Attachment = { id: number; file_name: string; status: string; attachment_kind: string; withdraw_reason?: string | null };
const base64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file); });

export function DossierAttachments({ documentId, readOnly = false }: { documentId: number; readOnly?: boolean }) {
  const { fetchJson } = useAuth(); const input = useRef<HTMLInputElement>(null); const [uploading, setUploading] = useState(false);
  const { data, refetch, isLoading } = useQuery({ queryKey: ['dossier-attachments', documentId], queryFn: () => fetchJson<{ attachments: Attachment[]; can_upload: boolean }>(`/documents/${documentId}/attachments`) });
  const upload = async (file?: File) => { if (!file || readOnly) return; setUploading(true); try { await fetchJson(`/documents/${documentId}/attachments`, { method: 'POST', body: JSON.stringify({ file_name: file.name, file_base64: await base64(file), file_type: file.type, attachment_kind: 'SUPPLEMENTAL' }) }); toast.success('Đã thêm tài liệu'); await refetch(); } catch (error: any) { toast.error(error.message || 'Không thể tải tệp'); } finally { setUploading(false); if (input.current) input.current.value = ''; } };
  return <section className="rounded-xl border bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Files className="h-4 w-4" />Tài liệu bổ sung</h2>{!readOnly && data?.can_upload ? <><input ref={input} className="sr-only" type="file" onChange={(event) => upload(event.target.files?.[0])} /><Button size="sm" variant="outline" onClick={() => input.current?.click()} disabled={uploading}><FilePlus2 className="mr-2 h-4 w-4" />{uploading ? 'Đang tải...' : 'Thêm tệp'}</Button></> : null}</div>{readOnly ? <p className="mb-3 text-xs text-slate-500">Tài liệu đã hoàn thành — chỉ xem, không thể thay đổi tệp bổ sung.</p> : null}<div className="space-y-2">{isLoading ? <p className="text-sm text-slate-500">Đang tải...</p> : data?.attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">{attachment.file_name}</p><p className="text-xs text-slate-500">{attachment.status === 'WITHDRAWN' ? `Đã thu hồi${attachment.withdraw_reason ? ` · ${attachment.withdraw_reason}` : ''}` : attachment.attachment_kind}</p></div><div className="flex items-center"><a className="p-2" href={`/api-proxy/documents/${documentId}/attachments/${attachment.id}/download`} title="Tải xuống"><Download className="h-4 w-4" /></a>{!readOnly && attachment.status === 'ACTIVE' ? <Button size="icon" variant="ghost" title="Quản lý tệp"><MoreHorizontal className="h-4 w-4" /></Button> : null}</div></div>)}</div></section>;
}
