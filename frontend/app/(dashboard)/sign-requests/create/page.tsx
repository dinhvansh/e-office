'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { AdhocWorkflowBuilder } from '@/components/workflow/AdhocWorkflowBuilder';
import { WorkflowCustomizer } from '@/components/workflow/WorkflowCustomizer';
import { WorkflowPreview } from '@/components/workflow/WorkflowPreview';
import { AttachmentsSection } from '@/components/documents/AttachmentsSection';
import { CCEmailsSection } from '@/components/documents/CCEmailsSection';
import { Signer, SignersSection } from '@/components/documents/SignersSection';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type WorkflowMode = 'no_approval' | 'strict' | 'flexible' | 'adhoc' | null;

export default function CreateSignRequestPage() {
  const router = useRouter();
  const { fetchJson } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [documentTypeId, setDocumentTypeId] = useState<number | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>(null);
  const [customizedSteps, setCustomizedSteps] = useState<any[] | null>(null);
  const [adhocSteps, setAdhocSteps] = useState<any[] | null>(null);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => fetchJson<DocumentType[]>('/document-types'),
  });

  const { data: workflowsData } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const data: any = await fetchJson('/workflows');
      return Array.isArray(data) ? data : data?.workflows || [];
    },
  });

  const { data: externalOrgs } = useQuery({
    queryKey: ['external-orgs'],
    queryFn: async () => {
      const data = await fetchJson<any>('/external-orgs');
      return Array.isArray(data) ? data : [];
    },
  });

  const activeDocumentTypes = useMemo(
    () => (documentTypes || []).filter((type) => type.is_active && (type.require_digital_signing || type.require_approval)),
    [documentTypes]
  );
  const activeWorkflows = useMemo(
    () => (Array.isArray(workflowsData) ? workflowsData.filter((workflow: any) => workflow.is_active) : []),
    [workflowsData]
  );

  useEffect(() => {
    if (!documentTypeId) {
      setSelectedDocType(null);
      setWorkflowMode(null);
      setSelectedWorkflowId(null);
      return;
    }

    const docType = activeDocumentTypes.find((type) => type.id === documentTypeId) || null;
    setSelectedDocType(docType);
    setCustomizedSteps(null);
    setAdhocSteps(null);

    if (!docType) {
      setWorkflowMode(null);
      setSelectedWorkflowId(null);
      return;
    }

    if (!docType.require_approval) {
      setWorkflowMode('no_approval');
      setSelectedWorkflowId(docType.default_workflow_id || null);
      return;
    }

    if (!docType.default_workflow_id) {
      setWorkflowMode('adhoc');
      setSelectedWorkflowId(null);
      return;
    }

    if (!docType.allow_workflow_override) {
      setWorkflowMode('strict');
      setSelectedWorkflowId(docType.default_workflow_id);
      return;
    }

    setWorkflowMode('flexible');
    setSelectedWorkflowId(docType.default_workflow_id);
  }, [documentTypeId, activeDocumentTypes]);

  const fileToBase64 = (selectedFile: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
    });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Vui lòng chọn file');
      if (!documentTypeId) throw new Error('Vui lòng chọn loại văn bản');

      if (selectedDocType?.require_approval) {
        if (workflowMode === 'adhoc' && (!adhocSteps || adhocSteps.length === 0)) {
          throw new Error('Vui lòng thêm ít nhất một bước phê duyệt/ký');
        }
        if (workflowMode === 'flexible' && !selectedWorkflowId) {
          throw new Error('Vui lòng chọn quy trình');
        }
      }

      for (const signer of signers) {
        if (!signer.email || !signer.name) {
          throw new Error('Vui lòng nhập đủ tên và email người ký ngoài');
        }
      }

      const payload: any = {
        file_name: file.name,
        file_base64: await fileToBase64(file),
        document_type_id: documentTypeId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        create_sign_request: true,
      };

      if (workflowMode === 'strict' && selectedDocType?.default_workflow_id) {
        payload.workflow_id = selectedDocType.default_workflow_id;
      }
      if (workflowMode === 'flexible' && selectedWorkflowId) {
        payload.workflow_id = selectedWorkflowId;
        if (customizedSteps?.length) payload.customized_steps = customizedSteps;
      }
      if (workflowMode === 'adhoc' && adhocSteps?.length) {
        payload.adhoc_steps = adhocSteps;
      }
      if (signers.length > 0) {
        payload.signers = signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          order: index + 1,
          type: signer.type,
          external_org_id: signer.externalOrgId,
        }));
      }
      if (ccEmails.length > 0) payload.cc_emails = ccEmails;
      if (attachments.length > 0) {
        payload.attachments = await Promise.all(
          attachments.map(async (attachment) => ({
            file_name: attachment.name,
            file_base64: await fileToBase64(attachment),
            file_type: attachment.type,
          }))
        );
      }

      const response = await fetchJson<{ document: any }>('/documents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return response.document;
    },
    onSuccess: (document: any) => {
      toast.success('Đã tạo bản nháp trình ký');
      if (document.sign_request_id) {
        router.push(`/sign-requests/${document.sign_request_id}/editor`);
      } else {
        router.push('/sign-requests');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể tạo trình ký');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Upload}
        title="Tạo trình ký"
        description="Tạo bản nháp, kéo sẵn luồng ký nếu có, rồi chuyển sang editor để đặt vị trí ký"
        iconColor="text-blue-600"
      />

      <form
        className="mx-auto max-w-5xl space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <h3 className="text-lg font-semibold">1. Chọn tài liệu và loại văn bản</h3>
              <p className="mt-1 text-sm text-slate-500">
                Sau khi tạo, hệ thống sẽ chuyển thẳng sang editor. Nếu loại văn bản có workflow, danh sách người ký sẽ được kéo lên sẵn.
              </p>
            </div>

            <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-blue-400">
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                {file ? (
                  <>
                    <p className="text-lg font-medium text-blue-600">{file.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">Click để chọn file</p>
                    <p className="mt-1 text-sm text-slate-500">Hỗ trợ PDF, DOC, DOCX</p>
                  </>
                )}
              </label>
            </div>

            <div className="space-y-2">
              <Label>Loại văn bản *</Label>
              <Select value={documentTypeId?.toString() || ''} onValueChange={(value) => setDocumentTypeId(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại văn bản" />
                </SelectTrigger>
                <SelectContent>
                  {activeDocumentTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedDocType && (
          <Card>
            <CardContent className="space-y-5 p-6">
              <div>
                <h3 className="text-lg font-semibold">2. Luồng áp dụng</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Workflow có vai trò ký sẽ tự tạo người ký trong editor. Bạn chỉ cần đặt vị trí ký trên tài liệu.
                </p>
              </div>

              {workflowMode === 'no_approval' && (
                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                  Loại văn bản này không yêu cầu phê duyệt. Nếu có người ký, hệ thống sẽ gửi ký sau khi bạn đặt vị trí trong editor.
                </div>
              )}

              {workflowMode === 'strict' && selectedWorkflowId && <WorkflowPreview workflowId={selectedWorkflowId} />}

              {workflowMode === 'flexible' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Chọn quy trình</Label>
                    <Select value={selectedWorkflowId?.toString() || ''} onValueChange={(value) => setSelectedWorkflowId(Number(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn quy trình" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeWorkflows.map((workflow: any) => (
                          <SelectItem key={workflow.id} value={String(workflow.id)}>
                            {workflow.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedWorkflowId && <WorkflowCustomizer defaultWorkflowId={selectedWorkflowId} onCustomize={setCustomizedSteps} />}
                </div>
              )}

              {workflowMode === 'adhoc' && <AdhocWorkflowBuilder onBuild={setAdhocSteps} />}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-6 p-6">
            <div>
              <h3 className="text-lg font-semibold">3. Thông tin bổ sung</h3>
              <p className="mt-1 text-sm text-slate-500">Người ký ngoài, người nhận CC và file đính kèm là tùy chọn.</p>
            </div>

            {selectedDocType?.require_digital_signing && (
              <SignersSection signers={signers} onChange={setSigners} externalOrgs={externalOrgs || []} />
            )}

            <div className="border-t pt-5">
              <CCEmailsSection emails={ccEmails} onChange={setCcEmails} />
            </div>

            <div className="border-t pt-5">
              <AttachmentsSection files={attachments} onChange={setAttachments} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/sign-requests')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Hủy
          </Button>
          <Button type="submit" disabled={!file || !documentTypeId || createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
            {createMutation.isPending ? 'Đang tạo...' : 'Tạo nháp và mở editor'}
            {!createMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
