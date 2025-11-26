'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import { Upload, ArrowLeft, ArrowRight, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkflowPreview } from '@/components/workflow/WorkflowPreview';
import { WorkflowCustomizer } from '@/components/workflow/WorkflowCustomizer';
import { AdhocWorkflowBuilder } from '@/components/workflow/AdhocWorkflowBuilder';
import { SignersSection, Signer } from '@/components/documents/SignersSection';
import { CCEmailsSection } from '@/components/documents/CCEmailsSection';
import { AttachmentsSection } from '@/components/documents/AttachmentsSection';

interface DocumentType {
  id: number;
  name: string;
  code: string;
  require_digital_signing: boolean;
  require_approval: boolean;
  default_workflow_id: number | null;
  allow_workflow_override: boolean;
  is_active: boolean;
}

export default function CreateSignRequestPage() {
  const router = useRouter();
  const { fetchJson } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [documentTypeId, setDocumentTypeId] = useState<number | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [workflowMode, setWorkflowMode] = useState<'no_approval' | 'strict' | 'flexible' | 'adhoc' | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [customizedSteps, setCustomizedSteps] = useState<any[] | null>(null);
  const [adhocSteps, setAdhocSteps] = useState<any[] | null>(null);
  
  // Signers, CC, Attachments state
  const [signers, setSigners] = useState<Signer[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Fetch document types
  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const data = await fetchJson<DocumentType[]>('/document-types');
      return data;
    },
  });

  // Fetch workflows
  const { data: workflowsData } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const data: any = await fetchJson('/workflows');
      return Array.isArray(data) ? data : (data?.workflows || []);
    },
  });

  // Fetch external organizations
  const { data: externalOrgs } = useQuery({
    queryKey: ['external-orgs'],
    queryFn: async () => {
      const response = await fetchJson<any>('/external-orgs');
      return Array.isArray(response) ? response : [];
    },
  });

  // Filter only document types that require digital signing (for Sign Requests menu)
  const activeDocumentTypes = documentTypes?.filter((type) => type.is_active && type.require_digital_signing) || [];
  const activeWorkflows = Array.isArray(workflowsData) ? workflowsData.filter((wf: any) => wf.is_active) : [];

  // Detect workflow mode when document type changes
  useEffect(() => {
    if (documentTypeId) {
      const docType = activeDocumentTypes.find((t) => t.id === documentTypeId);
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
        setSelectedWorkflowId(docType.default_workflow_id);
      }
    } else {
      setWorkflowMode(null);
      setSelectedDocType(null);
    }
  }, [documentTypeId, activeDocumentTypes]);

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:*/*;base64, prefix
      };
      reader.onerror = reject;
    });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Vui lòng chọn file');
      if (!documentTypeId) throw new Error('Vui lòng chọn loại văn bản');
      
      // Only validate signers if document type requires digital signing
      if (selectedDocType?.require_digital_signing) {
        if (signers.length === 0) throw new Error('Vui lòng thêm ít nhất 1 người ký');
        
        // Validate signers
        for (const signer of signers) {
          if (!signer.email || !signer.name) {
            throw new Error('Vui lòng điền đầy đủ thông tin người ký');
          }
        }
      }

      // Validate workflow if required
      if (selectedDocType?.require_approval) {
        if (workflowMode === 'adhoc' && (!adhocSteps || adhocSteps.length === 0)) {
          throw new Error('Vui lòng thêm ít nhất 1 bước phê duyệt');
        }
        if (workflowMode === 'flexible' && !selectedWorkflowId) {
          throw new Error('Vui lòng chọn quy trình phê duyệt');
        }
      }

      // Convert file to base64 first
      const base64 = await fileToBase64(file);
      
      console.log('📤 Upload debug:', {
        fileName: file.name,
        fileSize: file.size,
        base64Length: base64.length,
        documentTypeId,
        signersCount: signers.length,
      });
      
      // Prepare payload - match Documents page format exactly
      const payload: any = {
        file_name: file.name,
        file_base64: base64,
        document_type_id: documentTypeId,
      };

      // Add workflow data based on mode
      if (workflowMode === 'strict' && selectedDocType?.default_workflow_id) {
        payload.workflow_id = selectedDocType.default_workflow_id;
      } else if (workflowMode === 'flexible' && selectedDocType?.default_workflow_id) {
        payload.workflow_id = selectedDocType.default_workflow_id;
        if (customizedSteps && customizedSteps.length > 0) {
          payload.customized_steps = customizedSteps;
        }
      } else if (workflowMode === 'adhoc' && adhocSteps && adhocSteps.length > 0) {
        payload.adhoc_steps = adhocSteps;
      }

      // Add signers if provided
      if (signers.length > 0) {
        payload.signers = signers.map(s => ({
          email: s.email,
          name: s.name,
          order: s.order, // Use 'order' not 'signing_order'
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

      // Upload document with all data as JSON
      const response = await fetchJson<{ document: any }>('/documents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return response.document;
    },
    onSuccess: (document: any) => {
      // Reset form
      setFile(null);
      setDocumentTypeId(null);
      setSelectedWorkflowId(null);
      setSigners([]);
      setCcEmails([]);
      setAttachments([]);
      
      toast.success('Tạo yêu cầu ký thành công!');
      
      // Navigate to editor if has sign_request_id
      if (document.sign_request_id) {
        toast.info('Đang chuyển đến màn hình thêm chữ ký...');
        setTimeout(() => {
          router.push(`/sign-requests/${document.sign_request_id}/editor`);
        }, 1000);
      } else {
        // No signing required, go back to list
        router.push('/sign-requests');
      }
    },
    onError: (error: any) => {
      console.error('❌ Upload error:', error);
      console.error('Error response:', error.response?.data);
      const message = error.response?.data?.error?.message || error.message || 'Có lỗi xảy ra';
      toast.error(`Lỗi: ${message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Upload}
        title="Tạo yêu cầu ký mới"
        description="Upload tài liệu và thiết lập luồng ký"
        iconColor="text-blue-600"
      />

      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
        {/* Step 1: Upload File & Document Type */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Bước 1: Chọn tài liệu và loại văn bản</h3>
            
            {/* Upload File */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors mb-4">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    setFile(selectedFile);
                    toast.success(`Đã chọn: ${selectedFile.name}`);
                  }
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                {file ? (
                  <div>
                    <p className="text-lg font-medium text-blue-600">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                    >
                      Chọn file khác
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium">Click để chọn file</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Hỗ trợ: PDF, DOC, DOCX (tối đa 10MB)
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Document Type Selection */}
            <div className="space-y-2">
              <Label>Loại văn bản *</Label>
              <Select
                value={documentTypeId?.toString() || ''}
                onValueChange={(value) => setDocumentTypeId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại văn bản" />
                </SelectTrigger>
                <SelectContent>
                  {activeDocumentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Workflow Mode Indicator */}
            {selectedDocType && selectedDocType.require_digital_signing && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                ✍️ Loại văn bản này yêu cầu chữ ký số
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 1.5: Workflow Selection (if approval required) */}
        {selectedDocType && selectedDocType.require_approval && workflowMode && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quy trình phê duyệt</h3>
              
              {workflowMode === 'strict' && selectedDocType.default_workflow_id && (
                <div>
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    📋 Loại văn bản này sử dụng quy trình phê duyệt cố định
                  </div>
                  <WorkflowPreview workflowId={selectedDocType.default_workflow_id} />
                </div>
              )}

              {workflowMode === 'flexible' && (
                <div>
                  <div className="mb-3 space-y-2">
                    <Label>Chọn quy trình</Label>
                    <Select
                      value={selectedWorkflowId?.toString() || ''}
                      onValueChange={(value) => setSelectedWorkflowId(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn quy trình phê duyệt" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeWorkflows.map((wf: any) => (
                          <SelectItem key={wf.id} value={wf.id.toString()}>
                            {wf.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedWorkflowId && (
                    <WorkflowCustomizer
                      defaultWorkflowId={selectedWorkflowId}
                      onCustomize={setCustomizedSteps}
                    />
                  )}
                </div>
              )}

              {workflowMode === 'adhoc' && (
                <div>
                  <div className="mb-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                    💡 Tạo quy trình phê duyệt tùy chỉnh cho tài liệu này
                  </div>
                  <AdhocWorkflowBuilder onBuild={setAdhocSteps} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2/3: Signers, CC, Attachments */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">
              {selectedDocType?.require_approval ? 'Bước 3: Người ký & Thông tin bổ sung' : 'Bước 2: Người ký & Thông tin bổ sung'}
            </h3>

            {/* Signers Section - Only show if digital signing is required */}
            {selectedDocType?.require_digital_signing && (
              <div>
                {signers.length === 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    ⚠️ <strong>Bắt buộc:</strong> Vui lòng thêm ít nhất 1 người ký để tiếp tục
                  </div>
                )}
                <SignersSection 
                  signers={signers}
                  onChange={setSigners}
                  externalOrgs={externalOrgs || []}
                />
              </div>
            )}

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
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/sign-requests')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={!file || !documentTypeId || uploadMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {uploadMutation.isPending ? (
              'Đang xử lý...'
            ) : (
              <>
                Tiếp tục
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
