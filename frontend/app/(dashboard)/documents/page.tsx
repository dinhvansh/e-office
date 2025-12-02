"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { ChangeEvent, useState, useEffect } from "react";
import { FileText, Upload, Trash2, Download, Eye, Send, Archive, XCircle } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectWithIcon } from "@/components/ui/select-with-icon";
import { WorkflowPreview } from "@/components/workflow/WorkflowPreview";
import { WorkflowCustomizer } from "@/components/workflow/WorkflowCustomizer";
import { AdhocWorkflowBuilder } from "@/components/workflow/AdhocWorkflowBuilder";
import { AddRecipientsDialog } from "@/components/sign-requests/AddRecipientsDialog";
import { SignersSection, Signer } from "@/components/documents/SignersSection";
import { CCEmailsSection } from "@/components/documents/CCEmailsSection";
import { AttachmentsSection } from "@/components/documents/AttachmentsSection";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function DocumentsPage() {
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
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
  
  // Recipients dialog state
  const [showRecipientsDialog, setShowRecipientsDialog] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<DocumentRecord | null>(null);

  // Inline recipients, CC, and attachments state
  const [signers, setSigners] = useState<Signer[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'archive'>('all');
  
  // Filter and search state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [confidentialLevelFilter, setConfidentialLevelFilter] = useState<string>('all');

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ["documents", page, limit, statusFilter, searchQuery, documentTypeFilter, confidentialLevelFilter],
    queryFn: async () => {
      let url = `/documents?page=${page}&limit=${limit}`;
      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      if (documentTypeFilter && documentTypeFilter !== 'all') {
        url += `&document_type_id=${documentTypeFilter}`;
      }
      if (confidentialLevelFilter && confidentialLevelFilter !== 'all') {
        url += `&confidential_level=${confidentialLevelFilter}`;
      }
      const data = await fetchJson<{ 
        documents: DocumentRecord[];
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(url); // All documents including signed ones
      return data;
    },
  });

  const documents = documentsData?.documents || [];
  const pagination = documentsData?.pagination;

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
      const data: any = await fetchJson("/workflows");
      // Handle both response formats
      return Array.isArray(data) ? data : (data?.workflows || []);
    },
  });

  // Fetch external organizations once at parent level
  const { data: externalOrgs } = useQuery({
    queryKey: ["external-orgs"],
    queryFn: async () => {
      const response = await fetchJson<any>("/external-orgs");
      return Array.isArray(response) ? response : [];
    },
  });

  // Only show document types that DON'T require digital signing
  const activeDocumentTypes = documentTypesData?.filter((type) => 
    type.is_active && !type.require_digital_signing
  ) || [];
  const activeWorkflows = Array.isArray(workflowsData) ? workflowsData.filter((wf) => wf.is_active) : [];

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
      
      // Validate signers if digital signing is required
      if (selectedDocType?.require_digital_signing && signers.length > 0) {
        const hasEmptySigners = signers.some(s => !s.email || !s.name);
        if (hasEmptySigners) {
          throw new Error("Vui lòng điền đầy đủ thông tin người ký");
        }
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
      if (workflowMode === 'strict' && selectedDocType?.default_workflow_id) {
        // Strict mode: use default workflow (backend will auto-create signers)
        payload.workflow_id = selectedDocType.default_workflow_id;
      } else if (workflowMode === 'flexible' && selectedDocType?.default_workflow_id) {
        // Flexible mode: use default workflow but allow customization
        payload.workflow_id = selectedDocType.default_workflow_id;
        if (customizedSteps && customizedSteps.length > 0) {
          payload.customized_steps = customizedSteps;
        }
      } else if (workflowMode === 'adhoc' && adhocSteps && adhocSteps.length > 0) {
        // Ad-hoc mode: create new workflow
        payload.adhoc_steps = adhocSteps;
      }
      
      // Add signers if provided
      if (signers.length > 0) {
        payload.signers = signers.map(s => ({
          email: s.email,
          name: s.name,
          order: s.order,
          type: s.type,
          external_org_id: s.externalOrgId,
        }));
      }
      
      // Add CC emails if provided
      if (ccEmails.length > 0) {
        payload.cc_emails = ccEmails;
      }
      
      // Add attachments if provided
      if (attachments.length > 0) {
        const attachmentPromises = attachments.map(async (file) => ({
          file_name: file.name,
          file_base64: await fileToBase64(file),
          file_type: file.type,
        }));
        payload.attachments = await Promise.all(attachmentPromises);
      }
      
      const response = await fetchJson<{ document: DocumentRecord }>("/documents", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      return response.document;
    },
    onSuccess: (document) => {
      console.log("📄 Upload success, document:", document);
      console.log("🔍 sign_request_id:", document.sign_request_id);
      
      setSelectedFile(null);
      setFileName("");
      setSelectedDocumentTypeId(null);
      setSelectedWorkflowId(null);
      setConfidentialLevel("normal");
      setVisibilityScope("public");
      setSigners([]);
      setCcEmails([]);
      setAttachments([]);
      toast.success("Tải tài liệu thành công!");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      
      // ✨ Auto-redirect to editor if document requires signing
      if (document.sign_request_id) {
        console.log("✅ Has sign_request_id, redirecting to editor");
        toast.info("Đang chuyển đến màn hình thêm chữ ký...");
        setTimeout(() => {
          router.push(`/sign-requests/${document.sign_request_id}/editor`);
        }, 1000);
      } else {
        console.log("❌ No sign_request_id, staying on page");
      }
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

  const submitForApprovalMutation = useMutation({
    mutationFn: (id: number) => fetchJson(`/documents/${id}/submit-for-approval`, { 
      method: "POST",
      body: JSON.stringify({})
    }),
    onSuccess: () => {
      toast.success("Đã trình duyệt tài liệu thành công!");
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

  const handleView = (id: number) => {
    // Navigate to document flow page
    router.push(`/documents/${id}/flow`);
  };

  const handleDownload = async (id: number, fileName?: string, document?: DocumentRecord) => {
    try {
      // Get token from auth session
      const sessionStr = localStorage.getItem('esign.auth');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      const token = session?.tokens?.accessToken;
      
      if (!token) {
        throw new Error('Vui lòng đăng nhập lại');
      }
      
      // Use signed version if document is completed and has signed file
      const useSigned = document?.status === 'completed' && document?.signed_file_path;
      const endpoint = useSigned ? 'download-signed' : 'download';
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${id}/${endpoint}`;
      
      console.log('Downloading document:', { id, url, hasToken: !!token, useSigned });
      
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
    // Direct submit without dialog for now
    submitForApprovalMutation.mutate(documentId);
  };

  const confirmSubmitApproval = () => {
    if (submitApprovalDialog.documentId && selectedWorkflowForApproval) {
      submitApprovalMutation.mutate({
        documentId: submitApprovalDialog.documentId,
        workflowId: selectedWorkflowForApproval,
      });
    }
  };

  // Cancel sign request state
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; signRequestId: number | null; reason: string }>({
    open: false,
    signRequestId: null,
    reason: '',
  });

  const cancelSignRequestMutation = useMutation({
    mutationFn: async ({ signRequestId, reason }: { signRequestId: number; reason: string }) => {
      await fetchJson(`/sign-requests/${signRequestId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast.success("Đã hủy luồng ký! Email thông báo đã được gửi đến tất cả người ký.");
      setCancelDialog({ open: false, signRequestId: null, reason: '' });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: any) => {
      const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const handleCancelSignRequest = (signRequestId: number) => {
    setCancelDialog({ open: true, signRequestId, reason: '' });
  };

  const confirmCancelSignRequest = () => {
    if (cancelDialog.signRequestId) {
      cancelSignRequestMutation.mutate({
        signRequestId: cancelDialog.signRequestId,
        reason: cancelDialog.reason || 'Không có lý do',
      });
    }
  };

  // Archive document mutation
  const archiveDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await fetchJson(`/documents/${documentId}/archive`, { method: 'POST' });
    },
    onSuccess: () => {
      toast.success('Đã thanh lý tài liệu');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Không thể thanh lý');
    },
  });

  // Cancel document mutation
  const cancelDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await fetchJson(`/documents/${documentId}/cancel`, { method: 'POST' });
    },
    onSuccess: () => {
      toast.success('Đã hủy tài liệu');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Không thể hủy');
    },
  });

  const handleArchiveDocument = (documentId: number) => {
    if (confirm('Bạn có chắc muốn thanh lý tài liệu này?')) {
      archiveDocumentMutation.mutate(documentId);
    }
  };

  const handleCancelDocument = (documentId: number) => {
    if (confirm('Bạn có chắc muốn hủy tài liệu này?')) {
      cancelDocumentMutation.mutate(documentId);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      <PageHeader
        icon={FileText}
        title="Quản lý tài liệu"
        description="Upload, theo dõi và quản lý tài liệu PDF"
        iconColor="text-purple-600"
        actions={
          <Badge variant="secondary" className="text-xs md:text-sm whitespace-nowrap">
            {documents?.length ?? 0} tài liệu
          </Badge>
        }
      />

      {/* Upload Section - Hidden on mobile */}
      <Card className="hidden md:block">
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
          {/* Step 1: File Upload - Always visible */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Chọn file PDF để bắt đầu <span className="text-red-500">*</span></Label>
              <input
                id="file-upload-input"
                className="hidden"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {selectedFile ? 'Đổi file' : 'Tải file lên'}
              </Button>
            </div>
            
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileName("");
                    setSelectedDocumentTypeId(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            )}
          </div>

          {/* Step 2: Configuration - Only show after file is selected */}
          {selectedFile && (
            <>
              <div className="border-t pt-4 space-y-4">
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
                  {selectedDocType?.require_digital_signing && (
                    <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200">
                      <span className="text-purple-600 font-semibold text-xs">✍️ Loại văn bản này yêu cầu chữ ký điện tử</span>
                    </div>
                  )}
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
                </div>

                {/* Signers Section - External Signers (MOVED UP - FIRST!) */}
                {selectedDocType?.require_digital_signing && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <span className="text-blue-600">📋</span>
                        Phê duyệt và ký nội bộ (Internal Approval)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Người dùng nội bộ - Phải đăng nhập hệ thống để phê duyệt và ký
                      </p>
                    </div>
                    
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

                {/* Signers Section - Only show if digital signing is required (MOVED DOWN) */}
                {selectedDocType?.require_digital_signing && (() => {
                  // ⭐ Count internal signers from workflow steps
                  let internalSignersCount = 0;
                  if (customizedSteps && customizedSteps.length > 0) {
                    internalSignersCount = customizedSteps.filter(
                      (step: any) => step.participant_role === 'signer'
                    ).length;
                  }
                  
                  return (
                    <SignersSection 
                      signers={signers}
                      onChange={setSigners}
                      externalOrgs={externalOrgs || []}
                      internalSignersCount={internalSignersCount}
                    />
                  );
                })()}

                {/* CC Emails Section */}
                <CCEmailsSection 
                  emails={ccEmails}
                  onChange={setCcEmails}
                />

                {/* Attachments Section */}
                <AttachmentsSection 
                  files={attachments}
                  onChange={setAttachments}
                />

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={() => uploadMutation.mutate()}
                    disabled={uploadMutation.isPending || !selectedFile || !selectedDocumentTypeId}
                    size="lg"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Tải tài liệu
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách tài liệu</CardTitle>
              <CardDescription>
                Theo dõi trạng thái và quản lý tài liệu đã tải lên
              </CardDescription>
            </div>
            <Badge variant="outline">
              {isLoading ? "Đang tải..." : `${pagination?.total ?? documents?.length ?? 0} tài liệu`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'all' | 'archive');
            setPage(1);
            setSearchQuery('');
            // Auto-set filter based on tab
            if (value === 'archive') {
              setStatusFilter('completed');
            } else {
              setStatusFilter('all');
            }
          }} className="mb-4">
            <TabsList className="grid w-full max-w-full sm:max-w-md grid-cols-2">
              <TabsTrigger value="all">📋 Tất cả tài liệu</TabsTrigger>
              <TabsTrigger value="archive">📦 Quản lý lưu trữ</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filter and Search Section */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="🔍 Tìm kiếm theo tên, số văn bản..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // Reset to first page
                }}
                className="w-full"
              />
            </div>
            <div className="sm:w-48">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                {activeTab === 'all' ? (
                  <>
                    <option value="all">📋 Tất cả trạng thái</option>
                    <option value="draft">📝 Nháp</option>
                    <option value="pending_approval">⏳ Chờ duyệt</option>
                    <option value="approved">✅ Đã duyệt</option>
                    <option value="pending_signature">✍️ Chờ ký</option>
                    <option value="completed">✅ Hoàn thành</option>
                    <option value="active">✅ Hoạt động</option>
                    <option value="rejected">❌ Từ chối</option>
                    <option value="cancelled">🚫 Đã hủy</option>
                    <option value="archived">📦 Đã thanh lý</option>
                  </>
                ) : (
                  <>
                    <option value="completed">✅ Hoàn thành</option>
                    <option value="archived">📦 Đã thanh lý</option>
                    <option value="cancelled">🚫 Đã hủy</option>
                  </>
                )}
              </select>
            </div>
            <div className="sm:w-48">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={documentTypeFilter}
                onChange={(e) => {
                  setDocumentTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">📄 Tất cả loại VB</option>
                {documentTypesData?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-48">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={confidentialLevelFilter}
                onChange={(e) => {
                  setConfidentialLevelFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">🔒 Tất cả mức bảo mật</option>
                <option value="normal">🔓 Thường</option>
                <option value="confidential">🔐 Mật</option>
                <option value="secret">🔒 Tối mật</option>
              </select>
            </div>
          </div>
          {isLoading ? (
            <>
              <div className="rounded-lg border hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">ID</th>
                        <th className="px-4 py-3 text-left font-medium">Tên file</th>
                        <th className="px-4 py-3 text-left font-medium">Loại</th>
                        <th className="px-4 py-3 text-left font-medium">Người tạo</th>
                        <th className="px-4 py-3 text-left font-medium">Số văn bản</th>
                        <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                        <th className="px-4 py-3 text-left font-medium">Ngày tạo</th>
                        <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-3"><Skeleton className="h-5 w-12" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-48" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-8 w-16 rounded" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="md:hidden space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : documents && documents.length > 0 ? (
            <>
            <div className="rounded-lg border hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium">ID</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Tên file</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Số VB</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Loại</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Bảo mật</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Trạng thái</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Ngày</th>
                      <th className="px-2 py-2 text-right text-xs font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-2 py-3 font-semibold text-xs">#{doc.id}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate text-sm">
                              {doc.original_file_name || doc.title || `Document #${doc.id}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          {doc.document_number ? (
                            <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
                              {doc.document_number}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {doc.document_type ? (
                            <span className="text-xs truncate max-w-[100px] inline-block">{doc.document_type}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {doc.confidential_level === 'high' && <Badge variant="destructive" className="text-xs whitespace-nowrap">🔒 Cao</Badge>}
                          {doc.confidential_level === 'medium' && <Badge variant="outline" className="border-orange-500 text-orange-700 text-xs whitespace-nowrap">🔐 TB</Badge>}
                          {doc.confidential_level === 'normal' && <Badge variant="secondary" className="text-xs whitespace-nowrap">📄 Thường</Badge>}
                          {!doc.confidential_level && <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-2 py-3">
                          {doc.status === 'draft' && <Badge variant="secondary" className="text-xs whitespace-nowrap">📝 Nháp</Badge>}
                          {doc.status === 'pending_approval' && <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50 text-xs whitespace-nowrap">⏳ Chờ duyệt</Badge>}
                          {doc.status === 'approved' && <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 text-xs whitespace-nowrap">✅ Đã duyệt</Badge>}
                          {doc.status === 'pending_signature' && <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50 text-xs whitespace-nowrap">✍️ Chờ ký</Badge>}
                          {doc.status === 'completed' && <Badge variant="default" className="bg-green-600 text-white text-xs whitespace-nowrap">✅ Hoàn thành</Badge>}
                          {doc.status === 'active' && <Badge variant="default" className="bg-green-600 text-white text-xs whitespace-nowrap">✅ Hoạt động</Badge>}
                          {doc.status === 'rejected' && <Badge variant="destructive" className="bg-red-600 text-white text-xs whitespace-nowrap">❌ Từ chối</Badge>}
                          {doc.status === 'cancelled' && <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50 text-xs whitespace-nowrap">🚫 Đã hủy</Badge>}
                          {doc.status === 'archived' && <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-50 text-xs whitespace-nowrap">📦 Thanh lý</Badge>}
                        </td>
                        <td className="px-2 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {dayjs(doc.created_at).format("DD/MM/YY")}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Always show View button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Xem"
                              onClick={() => handleView(doc.id)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            
                            {/* Hide Download for archived/cancelled documents */}
                            {doc.status !== 'archived' && doc.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Tải xuống"
                                onClick={() => handleDownload(doc.id, doc.original_file_name || doc.title || `document-${doc.id}.pdf`, doc)}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            
                            {/* Delete button - always show for draft */}
                            {doc.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDelete(doc.id)}
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            
                            {/* Other action buttons only for non-archived/cancelled */}
                            {doc.status !== 'archived' && doc.status !== 'cancelled' && doc.status !== 'draft' && (
                              <>
                                {(doc.status === "pending_approval" || doc.status === "pending_signature") && doc.sign_request_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-600 whitespace-nowrap"
                                    onClick={() => handleCancelSignRequest(doc.sign_request_id!)}
                                    title="Hủy luồng ký"
                                  >
                                    ❌ Hủy
                                  </Button>
                                )}
                                {/* Archive tab actions - only for completed */}
                                {activeTab === 'archive' && doc.status === 'completed' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs hover:bg-orange-50 whitespace-nowrap"
                                      onClick={() => handleArchiveDocument(doc.id)}
                                      title="Thanh lý"
                                    >
                                      <Archive className="w-3 h-3 text-orange-600 mr-1" />
                                      Thanh lý
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs hover:bg-red-50 whitespace-nowrap"
                                      onClick={() => handleCancelDocument(doc.id)}
                                      title="Hủy tài liệu"
                                    >
                                      <XCircle className="w-3 h-3 text-red-600 mr-1" />
                                      Hủy
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} tài liệu
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Số dòng:</span>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        value={limit}
                        onChange={(e) => {
                          setLimit(Number(e.target.value));
                          setPage(1); // Reset to first page
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    {/* Page navigation */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(1)}
                        disabled={pagination.page === 1}
                      >
                        ««
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        ‹
                      </Button>
                      
                      <span className="px-3 text-sm">
                        Trang {pagination.page} / {pagination.totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        ›
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(pagination.totalPages)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        »»
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-lg border bg-card hover:shadow-md transition-shadow p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {doc.title || doc.original_file_name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {doc.document_number || `#${doc.id}`}
                      </p>
                    </div>
                    <StatusTag status={doc.status ?? "draft"} variant={doc.status === "active" ? "success" : "default"} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-muted-foreground">Loại:</span>
                      <p className="font-medium truncate">{doc.document_type?.name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ngày:</span>
                      <p className="font-medium">{dayjs(doc.created_at).format('DD/MM/YY')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/documents/${doc.id}/flow`)} className="flex-1 text-xs h-8">
                      <Eye className="w-3.5 h-3.5 mr-1" />Xem
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(doc.id)} className="flex-1 text-xs h-8">
                      <Download className="w-3.5 h-3.5 mr-1" />Tải
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {doc.status !== 'archived' && doc.status !== 'cancelled' && doc.status !== 'draft' && (
                          <>
                            {(doc.status === "pending_approval" || doc.status === "pending_signature") && doc.sign_request_id && (
                              <DropdownMenuItem onClick={() => handleCancelSignRequest(doc.sign_request_id!)} className="text-red-600">
                                <XCircle className="w-4 h-4 mr-2" />Hủy luồng ký
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {doc.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />Xóa
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {/* Mobile Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-3">
                  <span className="text-xs text-muted-foreground">
                    {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={pagination.page === 1} className="h-8 w-8 p-0">««</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(pagination.page - 1)} disabled={pagination.page === 1} className="h-8 w-8 p-0">‹</Button>
                    <span className="text-xs px-2">{pagination.page}/{pagination.totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="h-8 w-8 p-0">›</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(pagination.totalPages)} disabled={pagination.page === pagination.totalPages} className="h-8 w-8 p-0">»»</Button>
                  </div>
                </div>
              )}
            </div>
            </>
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

      {/* Recipients Dialog */}
      <AddRecipientsDialog
        open={showRecipientsDialog}
        onOpenChange={setShowRecipientsDialog}
        documentTitle={pendingDocument?.title || pendingDocument?.original_file_name || "Tài liệu"}
        onContinue={async (recipients) => {
          setShowRecipientsDialog(false);
          
          if (!pendingDocument?.sign_request_id) return;
          
          try {
            // Create signers in database
            toast.info("Đang tạo người ký...");
            
            for (const recipient of recipients) {
              await fetchJson(`/sign-requests/${pendingDocument.sign_request_id}/signers`, {
                method: 'POST',
                body: JSON.stringify({
                  email: recipient.email,
                  name: recipient.name,
                  role: recipient.role,
                  signing_order: recipient.order,
                }),
              });
            }
            
            toast.success("Đã tạo người ký thành công!");
            
            // Redirect to editor
            setTimeout(() => {
              router.push(`/sign-requests/${pendingDocument.sign_request_id}/editor`);
            }, 500);
          } catch (error: any) {
            toast.error(error?.message || "Không thể tạo người ký");
          }
        }}
      />

      {/* Cancel Sign Request Dialog */}
      {cancelDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <span className="text-xl">❌</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Hủy luồng ký</h3>
                  <p className="text-sm text-muted-foreground">
                    Email thông báo sẽ được gửi đến tất cả người ký
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-reason">
                  Lý do hủy <span className="text-muted-foreground">(tùy chọn)</span>
                </Label>
                <textarea
                  id="cancel-reason"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="VD: Tài liệu cần chỉnh sửa lại nội dung..."
                  value={cancelDialog.reason}
                  onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setCancelDialog({ open: false, signRequestId: null, reason: '' })}
                  disabled={cancelSignRequestMutation.isPending}
                >
                  Đóng
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmCancelSignRequest}
                  disabled={cancelSignRequestMutation.isPending}
                >
                  {cancelSignRequestMutation.isPending ? "Đang hủy..." : "Xác nhận hủy"}
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
