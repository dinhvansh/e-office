'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FilePlus2, Files } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';

type Attachment = { id: number; file_name: string; file_size: string | null; uploaded_at: string; attachment_kind: string; uploaded_by?: { full_name?: string | null; email: string } | null };
const toBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file); });

export function DossierAttachments({ documentId }: { documentId: number }) {
  const { fetchJson } = useAuth(); const inputRef = useRef<HTMLInputElement>(null); const [uploading, setUploading] = useState(false);
  const { data, refetch, isLoading } = useQuery({ queryKey: ['dossier-attachments', documentId], queryFn: () => fetchJson<{ attachments: Attachment[]; can_upload: boolean }>(`/documents/${documentId}/attachments`) });
  const upload = async (file?: File) => { if (!file) return; setUploading(true); try { await fetchJson(`/documents/${documentId}/attachments`, { method: 'POST', body: JSON.stringify({ file_name: file.name, file_base64: await toBase64(file), file_type: file.type || undefined, attachment_kind: 'SUPPLEMENTAL' }) }); toast.success('Đã thêm tài liệu bổ sung'); await refetch(); } catch (error: any) { toast.error(error.message || 'Không thể tải tệp lên'); } finally { setUploading(false); if (inputRef.current) inputRef.current.value = ''; } };
  return <section className="rounded-xl border bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold text-slate-950"><Files className="h-4 w-4 text-slate-500" />Tài liệu bổ sung</h2>{data?.can_upload ? <><input ref={inputRef} className="sr-only" type="file" onChange={(event) => upload(event.target.files?.[0])} /><Button variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}><FilePlus2 className="mr-2 h-4 w-4" />{uploading ? 'Đang tải...' : 'Thêm tệp'}</Button></> : null}</div><div className="space-y-2">{isLoading ? <p className="text-sm text-slate-500">Đang tải tài liệu...</p> : data?.attachments.length ? data.attachments.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{item.file_name}</p><p className="mt-1 text-xs text-slate-500"><span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5">{item.attachment_kind}</span>{item.uploaded_by?.full_name || item.uploaded_by?.email || 'Hệ thống'} · {new Date(item.uploaded_at).toLocaleString('vi-VN')} · {item.file_size ? `${Math.max(1, Math.round(Number(item.file_size) / 1024))} KB` : '—'}</p></div><a href={`/api-proxy/documents/${documentId}/attachments/${item.id}/download`} className="rounded p-1.5 text-slate-600 hover:bg-slate-100"><Download className="h-4 w-4" /></a></div></div>) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Chưa có tài liệu bổ sung hoặc tệp đính kèm bình luận.</p>}</div></section>;
}
