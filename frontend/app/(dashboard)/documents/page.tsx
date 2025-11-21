"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChangeEvent, useState, useEffect } from "react";
import { FileText, Upload, Trash2, Download, Eye, Send } from "lucide-react";
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
import { WorkflowPreview } from "@/components/workflow/WorkflowPreview";
import { WorkflowCustomizer } from "@/components/workflow/WorkflowCustomizer";
import { AdhocWorkflowBuilder } from "@/components/workflow/AdhocWorkflowBuilder";

export default function DocumentsPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<number | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [confidentialLevel, setConfidentialLevel] = useState("normal");
  const [visibilityScope, setVisibilityScope] = useState("public");
  const [workflowMode, setWorkflowMode] = useState<'no_approval' | 'strict' | 'flexible' | 'adhoc' | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [customizedSteps, setCustomizedSteps] = useState<any[] | null>(null);
  const [adhocSteps, setAdhocSteps] = useState<any[] | null>(null);

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

  // Detect workflow mode when document type changes
  useEffect(() => {
    if (selectedDocumentTypeId) {
      const docType = activeDocumentTypes.find((t) => t.id === selectedDocumentTypeId);
      setSelectedDocType(docType || null);
      
      if (!docType) {
        setWorkflowMode(null);
        return;
      }

      if (!docType.require_approval) {
        setWorkflowMode('no_approval');
      } else if (!docType.default_workflow_id) {
        setWorkflowMode('adhoc');
      } else if (!docType.allow_workflow_override) {
        setWorkflowMode('strict');
      } else {
        setWorkflowMode('flexible');
      }
    } else {
      setWorkflowMode(null);
      setSelectedDocType(null);
    }
  }, [selectedDocumentTypeId, activeDocumentTypes]);

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
      
      // Add workflow data based on mode
      if (workflowMode === 'adhoc' && adhocSteps && adhocSteps.length > 0) {
        payload.adhoc_steps = adhocSteps;
      } else if (workflowMode === 'flexible' && customizedSteps && customizedSteps.length > 0) {
        payload.customized_steps = customizedSteps;
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

  const [submitApprovalDialog, setSubmitApprovalDialog] = useState<{
    open: boolean;
    documentId: number | null;
  }>({
    open: false,
    documentId: null,
  });

  const [selectedWorkflowForApproval, setSelectedWorkflowForApproval] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleView = async (id: number) => {
    try {
      // Get token from auth session
      const sessionStr = localStorage.getItem('esign.auth');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      const token = session?.tokens?.accessToken;
      
      if (!token) {
        throw new Error('Vui lòng đăng nhập lại');
      }
      
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${id}/view`;
      
      console.log('Viewing document:', { id, url, hasToken: !!token });
      
      // Fetch with token, then create blob URL
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('View response:', { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        // Try to get error message from response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          console.error('View error data:', errorData);
          const errorMsg = errorData.error?.message || 'Failed to load document';
          
          // User-friendly message for seed data
          if (errorMsg.includes('seed data')) {
            throw new Error('Tài liệu này không có file thật. Vui lòng upload tài liệu mới để test.');
          }
          
          throw new Error(errorMsg);
        }
        throw new Error(`Failed to load document (${response.status})`);
      }
      
      const blob = await response.blob();
      console.log('Blob created:', { size: blob.size, type: blob.type });
      
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error: any) {
      const message = error?.message || 'Không thể xem tài liệu';
      toast.error(message);
      console.error('View error:', error);
    }
  };

  const handleDownload = async (id: number, fileName?: string) => {
    try {
      // Get token from auth session
      const sessionStr = localStorage.getItem('esign.auth');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      const token = session?.tokens?.accessToken;
      
      if (!token) {
        throw new Error('Vui lòng đăng nhập lại');
      }
      
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${id}/download`;
      
      console.log('Downloading document:', { id, url, hasToken: !!token });
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Download response:', { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        // Try to get error message from response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          console.error('Download error data:', errorData);
          const errorMsg = errorData.error?.message || 'Failed to download document';
          
          // User-friendly message for seed data
          if (errorMsg.includes('seed data')) {
            throw new Error('Tài liệu này không có file thật. Vui lòng upload tài liệu mới để test.');
          }
          
          throw new Error(errorMsg);
        }
        throw new Error(`Failed to download document (${response.status})`);
      }
      
      const blob = await response.blob();
      console.log('Blob created:', { size: blob.size, type: blob.type });
      
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      toast.success('Tải tài liệu thành công!');
    } catch (error: any) {
      const message = error?.message || 'Không thể tải tài liệu';
      toast.error(message);
      console.error('Download error:', error);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const submitApprovalMutation = useMutation({
    mutationFn: async ({ documentId, workflowId }: { documentId: number; workflowId: number }) => {
      await fetchJson("/approvals/submit", {
        method: "POST",
        body: JSON.stringify({
          document_id: documentId,
          workflow_id: workflowId,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Trình ký thành công! Người phê duyệt đã được thông báo.");
      setSubmitApprovalDialog({ open: false, documentId: null });
      setSelectedWorkflowForApproval(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const handleSubmitApproval = (documentId: number) => {
    setSubmitApprovalDialog({ open: true, documentId });
  };

  const confirmSubmitApproval = () => {
    if (submitApprovalDialog.documentId && selectedWorkflowForApproval) {
      submitApprovalMutation.mutate({
        documentId: submitApprovalDialog.documentId,
        workflowId: selectedWorkflowForApproval,
      });
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
            <p className="text-xs text-muted-foreground">
              Quy trình phê duyệt sẽ tự động hiển thị dựa trên loại văn bản
            </p>
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

          {/* Workflow Components - Conditional Rendering */}
          {workflowMode && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              {workflowMode === 'no_approval' && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-lg">ℹ️</span>
                  <p>Loại văn bản này không cần phê duyệt. Tài liệu sẽ được kích hoạt ngay sau khi upload.</p>
                </div>
              )}

              {workflowMode === 'strict' && selectedDocType?.default_workflow_id && (
                <WorkflowPreview workflowId={selectedDocType.default_workflow_id} />
              )}

              {workflowMode === 'flexible' && selectedDocType?.default_workflow_id && (
                <WorkflowCustomizer
                  defaultWorkflowId={selectedDocType.default_workflow_id}
                  onCustomize={(steps) => setCustomizedSteps(steps)}
                />
              )}

              {workflowMode === 'adhoc' && (
                <AdhocWorkflowBuilder
                  onBuild={(steps) => setAdhocSteps(steps)}
                />
              )}
            </div>
          )}

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
                            <span className="truncate max-w-xs">
                              {doc.original_file_name || doc.title || `Document #${doc.id}`}
                            </span>
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
                              onClick={() => handleView(doc.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Tải xuống"
                              onClick={() => handleDownload(doc.id, doc.original_file_name || doc.title || `document-${doc.id}.pdf`)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {doc.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleSubmitApproval(doc.id)}
                                title="Trình ký"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
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

      {/* Submit for Approval Dialog */}
      {submitApprovalDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Trình ký văn bản</h3>
                  <p className="text-sm text-muted-foreground">
                    Chọn quy trình phê duyệt cho văn bản này
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-workflow">
                  Quy trình phê duyệt <span className="text-red-500">*</span>
                </Label>
                <select
                  id="approval-workflow"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedWorkflowForApproval || ""}
                  onChange={(e) => setSelectedWorkflowForApproval(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- Chọn quy trình --</option>
                  {activeWorkflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name} ({workflow.steps?.length || 0} bước)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Văn bản sẽ được gửi đến người phê duyệt theo quy trình đã chọn
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSubmitApprovalDialog({ open: false, documentId: null });
                    setSelectedWorkflowForApproval(null);
                  }}
                >
                  Hủy bỏ
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmSubmitApproval}
                  disabled={!selectedWorkflowForApproval || submitApprovalMutation.isPending}
                >
                  {submitApprovalMutation.isPending ? (
                    "Đang xử lý..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Trình ký
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
