"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChangeEvent, useState } from "react";
import { FileText, Upload, Trash2, Download, Eye } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { DocumentRecord, DocumentType } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusTag } from "@/components/ui/status-tag";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectWithIcon } from "@/components/ui/select-with-icon";

export default function DocumentsPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<number | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [confidentialLevel, setConfidentialLevel] = useState("normal");
  const [visibilityScope, setVisibilityScope] = useState("public");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const data = await fetchJson<{ documents: DocumentRecord[] }>("/documents");
      return data.documents;
    },
  });

  const { data: documentTypesData } = useQuery({
    queryKey: ["document-types"],
    queryFn: async () => {
      const data = await fetchJson<DocumentType[]>("/document-types");
      return data;
    },
  });

  const { data: workflowsData } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const data = await fetchJson<{ workflows: any[] }>("/workflows");
      return data.workflows;
    },
  });

  const activeDocumentTypes = documentTypesData?.filter((type) => type.is_active) || [];
  const activeWorkflows = workflowsData?.filter((wf) => wf.is_active) || [];

  // Map document types to options with icons
  const getDocumentTypeIcon = (code: string) => {
    const iconMap: Record<string, string> = {
      CV_DEN: '📄',
      CV_DI: '📤',
      HOP_DONG: '📋',
      QUYET_DINH: '📜',
      THONG_BAO: '📢',
      BIEN_BAN: '📝',
      DE_XUAT: '💡',
      BAO_CAO: '📊',
    };
    return iconMap[code] || '📄';
  };

  const documentTypeOptions = activeDocumentTypes.map((type) => ({
    value: type.id,
    label: `${type.name} (${type.code})`,
    icon: getDocumentTypeIcon(type.code),
  }));

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Vui lòng chọn file PDF");
      }
      if (!selectedDocumentTypeId) {
        throw new Error("Vui lòng chọn loại văn bản");
      }
      const base64 = await fileToBase64(selectedFile);
      const payload: any = {
        file_name: fileName || selectedFile.name,
        file_base64: base64,
        document_type_id: selectedDocumentTypeId,
        confidential_level: confidentialLevel,
        visibility_scope: visibilityScope,
      };
      
      // Add workflow_id if selected
      if (selectedWorkflowId) {
        payload.workflow_id = selectedWorkflowId;
      }
      
      await fetchJson("/documents", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setSelectedFile(null);
      setFileName("");
      setSelectedDocumentTypeId(null);
      setSelectedWorkflowId(null);
      setConfidentialLevel("normal");
      setVisibilityScope("public");
      toast.success("Tải tài liệu thành công!");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
    setFileName(file?.name ?? "");
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Xóa tài liệu thành công!");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });

  const handleDelete = (id: number) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Quản lý tài liệu"
        description="Upload, theo dõi và quản lý tài liệu PDF"
        iconColor="text-purple-600"
        actions={
          <Badge variant="secondary" className="text-sm">
            {documents?.length ?? 0} tài liệu
          </Badge>
        }
      />

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload tài liệu mới
          </CardTitle>
          <CardDescription>
            Chọn loại văn bản và tải file PDF lên hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="document-type">
                Loại văn bản <span className="text-red-500">*</span>
              </Label>
              <SelectWithIcon
                options={documentTypeOptions}
                value={selectedDocumentTypeId}
                onChange={(value) => setSelectedDocumentTypeId(Number(value))}
                placeholder="-- Chọn loại văn bản --"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow">
                Quy trình phê duyệt
              </Label>
              <select
                id="workflow"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedWorkflowId || ""}
                onChange={(e) => setSelectedWorkflowId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- Không cần phê duyệt --</option>
                {activeWorkflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name} ({workflow.steps.length} bước)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Chọn quy trình nếu văn bản cần phê duyệt
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="file-name">Tên hiển thị</Label>
              <Input
                id="file-name"
                value={fileName}
                placeholder="Hợp đồng đối tác 2025"
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidential-level">Mức độ mật</Label>
              <select
                id="confidential-level"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={confidentialLevel}
                onChange={(e) => setConfidentialLevel(e.target.value)}
              >
                <option value="normal">🔓 Normal (Thông thường)</option>
                <option value="confidential">🔒 Confidential (Bảo mật)</option>
                <option value="secret">🔐 Secret (Tuyệt mật)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visibility-scope">Phạm vi hiển thị</Label>
              <select
                id="visibility-scope"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={visibilityScope}
                onChange={(e) => setVisibilityScope(e.target.value)}
              >
                <option value="public">🌐 Public (Công khai)</option>
                <option value="department">🏢 Department (Phòng ban)</option>
                <option value="private">🔒 Private (Riêng tư)</option>
              </select>
            </div>
            <div className="space-y-2">
              {/* Empty space for alignment */}
            </div>
          </div>



          {/* File Upload Dropzone */}
          <div className="space-y-2">
            <Label>Chọn file PDF</Label>
            <div className="relative">
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
                <input
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
                <div className="text-center">
                  {selectedFile ? (
                    <div className="space-y-1">
                      <FileText className="w-8 h-8 mx-auto text-primary" />
                      <p className="font-semibold text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="font-semibold text-sm">Kéo thả PDF vào đây</p>
                      <p className="text-xs text-muted-foreground">Hoặc click để chọn file</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={uploadMutation.isPending || !selectedFile || !selectedDocumentTypeId}
            className="w-full md:w-auto"
          >
            {uploadMutation.isPending ? (
              <>Đang tải...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Tải tài liệu
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách tài liệu</CardTitle>
              <CardDescription>
                Theo dõi trạng thái và quản lý tài liệu đã tải lên
              </CardDescription>
            </div>
            <Badge variant="outline">
              {isLoading ? "Đang tải..." : `${documents?.length ?? 0} tài liệu`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">ID</th>
                      <th className="px-4 py-3 text-left font-medium">Tên file</th>
                      <th className="px-4 py-3 text-left font-medium">Số văn bản</th>
                      <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                      <th className="px-4 py-3 text-left font-medium">Ngày tạo</th>
                      <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-semibold">#{doc.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate max-w-xs">{doc.file_path.split("/").pop()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {doc.document_number ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {doc.document_number}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusTag 
                            status={doc.status ?? "draft"} 
                            variant={doc.status === "active" ? "success" : "default"}
                          />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {dayjs(doc.created_at).format("DD/MM/YYYY HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Xem"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Tải xuống"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(doc.id)}
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Chưa có tài liệu"
              description="Tải tài liệu đầu tiên lên hệ thống để bắt đầu"
            />
          )}
        </CardContent>
      </Card>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, id: null })}
        onConfirm={confirmDelete}
        title="Xác nhận xóa tài liệu"
        description="Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác."
        confirmText="Xóa tài liệu"
        cancelText="Hủy bỏ"
        variant="danger"
        icon="trash"
      />
    </div>
  );
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString().split(",")[1];
      if (!result) {
        reject(new Error("Khong the doc file"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Khong the doc file"));
    reader.readAsDataURL(file);
  });
};
