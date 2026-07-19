"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { DestructiveConfirmationDialog } from "@/components/ui/destructive-confirmation-dialog";

type Item={id:number;title:string|null;document_number:string|null;previous_status:string|null;archived_at:string|null;archived_by:number|null;sign_request?:{id:number}|null};
export default function ArchivePage(){const{fetchJson,hasPermission}=useAuth();const qc=useQueryClient();const[s,setS]=useState("");const[selected,setSelected]=useState<Item|null>(null);const q=useQuery({queryKey:["archive",s],enabled:hasPermission("archive:view"),queryFn:()=>fetchJson<{documents:Item[]}>(`/archive/documents${s?`?search=${encodeURIComponent(s)}`:""}`)});const m=useMutation({mutationFn:(id:number)=>fetchJson(`/archive/documents/${id}/restore`,{method:"POST"}),onSuccess:()=>{toast.success("Đã khôi phục về Đã hủy");qc.invalidateQueries({queryKey:["archive"]});setSelected(null)},onError:()=>toast.error("Không thể khôi phục tài liệu")});return <div className="space-y-6"><PageHeader icon={Archive} title="Lưu trữ" description="Tài liệu đã lưu trữ"/><Card><CardContent className="space-y-4 p-4"><Input value={s} onChange={e=>setS(e.target.value)} placeholder="Tìm tài liệu"/>{!q.data?.documents.length?<EmptyState icon={Archive} title="Archive trống" description="Không có tài liệu lưu trữ."/>:q.data.documents.map(d=><div className="flex justify-between rounded border p-3" key={d.id}><div><b>{d.document_number||`#${d.id}`} · {d.title||"Không tiêu đề"}</b><p className="text-sm text-slate-500">Trước: {d.previous_status||"—"} · {d.archived_at?new Date(d.archived_at).toLocaleString("vi-VN"):"—"} · Request {d.sign_request?.id||"—"}</p></div>{hasPermission("archive:restore")&&<Button variant="outline" disabled={m.isPending} onClick={()=>setSelected(d)}><RotateCcw className="mr-2 h-4 w-4"/>Khôi phục</Button>}</div>)}</CardContent></Card><DestructiveConfirmationDialog open={!!selected} onOpenChange={v=>!v&&setSelected(null)} title="Khôi phục tài liệu" targetName={selected?.title||"tài liệu"} description="Tài liệu sẽ trở về trạng thái Đã hủy. Các workflow, approval và phiên ký cũ không được kích hoạt lại." confirmLabel="Khôi phục" destructive={false} onConfirm={()=>m.mutateAsync(selected!.id)}/></div>}
