'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { AdhocWorkflowBuilder } from '@/components/workflow/AdhocWorkflowBuilder';
import { WorkflowCustomizer } from '@/components/workflow/WorkflowCustomizer';
import { WorkflowPreview } from '@/components/workflow/WorkflowPreview';
import { AttachmentsSection } from '@/components/documents/AttachmentsSection';
import { CCEmailsSection } from '@/components/documents/CCEmailsSection';
import { Signer, SignersSection } from '@/components/documents/SignersSection';
import { InternalSigner, InternalSignersSelector } from '@/components/documents/InternalSignersSelector';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AsyncErrorState, InlineActionFeedback } from '@/components/ui/async-state';

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

interface ExistingSignRequestResponse {
  sign_request?: {
    id: number;
    status?: string | null;
    document_id: number;
    document?: {
      id: number;
      title?: string | null;
      original_file_name?: string | null;
      document_type_id?: number | null;
    } | null;
    signers?: Array<{
      id: number;
      user_id?: number | null;
      email?: string | null;
      name?: string | null;
      role?: string | null;
      signing_order?: number | null;
      is_internal?: boolean | null;
      position_data?: Record<string, unknown> | null;
    }>;
    workflow_snapshot?: {
      id: number;
      based_on_template?: number | null;
      steps: Array<{
        id: number;
        step_name: string;
        approver_type: string;
        approver_id?: number | null;
        participant_role?: string | null;
        due_in_days?: number | null;
        order: number;
      }>;
    } | null;
  };
}

interface ExistingAttachment {
  id: number;
  file_name: string;
  file_size?: number | string | null;
  file_type?: string | null;
}

interface ExistingDocumentResponse {
  document?: {
    id: number;
    cc_emails?: string[];
  };
}

export default function CreateSignRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchJson } = useAuth();

  const existingSignRequestId = Number(searchParams.get('signRequestId') || '');
  const isEditMode = Number.isFinite(existingSignRequestId) && existingSignRequestId > 0;
  const replacedSignRequestId = Number(searchParams.get('replaces') || '');
  const isReplacementDraft = Number.isFinite(replacedSignRequestId) && replacedSignRequestId > 0;

  const [file, setFile] = useState<File | null>(null);
  const [documentTypeId, setDocumentTypeId] = useState<number | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>(null);
  const [customizedSteps, setCustomizedSteps] = useState<any[] | null>(null);
  const [adhocSteps, setAdhocSteps] = useState<any[] | null>(null);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [internalSigners, setInternalSigners] = useState<InternalSigner[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const submittingRef = useRef(false);
  const [submissionLocked, setSubmissionLocked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  // Returning from the PDF editor is normally about correcting participants,
  // so do not make users walk through the locked document screen first.
  const [currentStep, setCurrentStep] = useState(isEditMode ? 3 : 1);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const customizedStepsRef = useRef<any[] | null>(null);
  const adhocStepsRef = useRef<any[] | null>(null);
  const steps = ['Tài liệu', 'Workflow', 'Người tham gia', 'Rà soát'];

  const validateStep = (step: number) => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (!isEditMode && !file) errors.file = 'Vui lòng chọn tệp trước khi tiếp tục.';
      if (!documentTypeId) errors.documentType = 'Vui lòng chọn loại văn bản.';
    }
    if (step === 2 && selectedDocType?.require_approval && !hasConfiguredApprovalStep) {
      errors.workflow = 'Loại văn bản này cần ít nhất một bước phê duyệt hợp lệ.';
    }
    if (step === 3) {
      signers.forEach((signer, index) => { if (!signer.name || !signer.email) errors[`signer-${index}`] = 'Mỗi người ký cần có họ tên và email.'; });
      internalSigners.forEach((signer, index) => { if (!signer.user_id || !signer.name || !signer.email) errors[`internal-signer-${index}`] = 'Vui lòng chọn người ký nội bộ hợp lệ.'; });
      if (selectedDocType?.require_digital_signing && !hasConfiguredSigner) {
        errors.signerRequired = 'Loại văn bản này cần ít nhất một người ký nội bộ hoặc bên ngoài.';
      }
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => { if (validateStep(currentStep)) setCurrentStep((step) => Math.min(4, step + 1)); };

  const { data: documentTypes } = useQuery({
    queryKey: ['document-types', 'sign-request-purpose'],
    queryFn: async () => fetchJson<DocumentType[]>('/document-types?purpose=sign_request'),
  });

  const { data: workflowsData } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const data: any = await fetchJson('/workflows');
      return Array.isArray(data) ? data : data?.workflows || [];
    },
  });

  const { data: existingSignRequestData, isLoading: isLoadingExisting } = useQuery<ExistingSignRequestResponse>({
    queryKey: ['sign-request-create-config', existingSignRequestId],
    enabled: isEditMode,
    queryFn: async () => fetchJson(`/sign-requests/${existingSignRequestId}`) as Promise<ExistingSignRequestResponse>,
  });

  const { data: externalOrgs } = useQuery({
    queryKey: ['external-orgs'],
    queryFn: async () => {
      const data = await fetchJson<any>('/external-orgs');
      return Array.isArray(data) ? data : [];
    },
  });

  const existingDocumentId = existingSignRequestData?.sign_request?.document?.id;
  const { data: existingAttachments } = useQuery<ExistingAttachment[]>({
    queryKey: ['sign-request-create-attachments', existingDocumentId],
    enabled: isEditMode && !!existingDocumentId,
    queryFn: async () => {
      const data: any = await fetchJson(`/documents/${existingDocumentId}/attachments`);
      return Array.isArray(data?.attachments) ? data.attachments : [];
    },
  });
  const { data: existingDocumentData } = useQuery<ExistingDocumentResponse>({
    queryKey: ['sign-request-create-document', existingDocumentId],
    enabled: isEditMode && !!existingDocumentId,
    queryFn: async () => fetchJson(`/documents/${existingDocumentId}`) as Promise<ExistingDocumentResponse>,
  });

  const activeDocumentTypes = useMemo(
    () => (documentTypes || []).filter((type) => type.is_active && (type.require_digital_signing || type.require_approval)),
    [documentTypes],
  );

  const activeWorkflows = useMemo(
    () => (Array.isArray(workflowsData) ? workflowsData.filter((workflow: any) => workflow.is_active) : []),
    [workflowsData],
  );

  const templateWorkflowSteps = useMemo(() => {
    if (!selectedWorkflowId) return [];
    const workflow = activeWorkflows.find((item: any) => item.id === selectedWorkflowId);
    return Array.isArray(workflow?.steps) ? workflow.steps : [];
  }, [activeWorkflows, selectedWorkflowId]);

  const effectiveWorkflowSteps = useMemo(() => {
    if (workflowMode === 'adhoc') {
      return (adhocSteps || []).map((step: any) => ({ ...step, participant_role: 'approver' }));
    }
    if (workflowMode === 'flexible' && customizedSteps) return customizedSteps;
    return templateWorkflowSteps;
  }, [adhocSteps, customizedSteps, templateWorkflowSteps, workflowMode]);

  const existingInternalSignerCount = useMemo(
    () => (existingSignRequestData?.sign_request?.signers || []).filter((signer) => signer.is_internal).length,
    [existingSignRequestData],
  );
  const workflowSignerStepCount = effectiveWorkflowSteps.filter(
    (step: any) => step.participant_role === 'signer',
  ).length;
  const configuredInternalSignerCount =
    workflowMode === 'no_approval'
      ? internalSigners.length
      : isEditMode && workflowMode === 'strict'
      ? existingInternalSignerCount
      : isEditMode && workflowMode === 'flexible' && customizedSteps === null
        ? existingInternalSignerCount
        : workflowSignerStepCount;
  const hasConfiguredApprovalStep = effectiveWorkflowSteps.some(
    (step: any) => step.participant_role !== 'signer',
  );
  const hasConfiguredSigner = signers.length + configuredInternalSignerCount > 0;

  useEffect(() => {
    void Promise.resolve().then(() => {
    if (!documentTypeId) {
      setSelectedDocType(null);
      setSelectedWorkflowId(null);
      setWorkflowMode(null);
      setCustomizedSteps(null);
      setAdhocSteps(null);
      customizedStepsRef.current = null;
      adhocStepsRef.current = null;
      return;
    }

    const docType = activeDocumentTypes.find((item) => item.id === documentTypeId) || null;
    setSelectedDocType(docType);
    setCustomizedSteps(null);
    setAdhocSteps(null);
    customizedStepsRef.current = null;
    adhocStepsRef.current = null;

    if (!docType) {
      setSelectedWorkflowId(null);
      setWorkflowMode(null);
      return;
    }

    if (!docType.require_approval) {
      setWorkflowMode('no_approval');
      setSelectedWorkflowId(docType.default_workflow_id || null);
      return;
    }

    if (docType.default_workflow_id) {
      setSelectedWorkflowId(docType.default_workflow_id);
      setWorkflowMode(docType.allow_workflow_override ? 'flexible' : 'strict');
      return;
    }

    setSelectedWorkflowId(null);
      setWorkflowMode('adhoc');
    });
  }, [documentTypeId, activeDocumentTypes]);

  useEffect(() => {
    if (!isEditMode || !existingSignRequestData?.sign_request) return;

    const signRequest = existingSignRequestData.sign_request;
    void Promise.resolve().then(() => {
    setDocumentTypeId(signRequest.document?.document_type_id || null);

    const externalSigners: Signer[] = (signRequest.signers || [])
      .filter((signer) => !signer.is_internal)
      .map((signer, index) => ({
        id: String(signer.id),
        type: (signer.position_data?.external_org_id ? 'external' : 'manual') as 'manual' | 'external',
        email: signer.email || '',
        name: signer.name || '',
        order: index + 1,
        role: signer.role || 'signer',
        externalOrgId:
          typeof signer.position_data?.external_org_id === 'number'
            ? (signer.position_data.external_org_id as number)
            : undefined,
      }));

    setSigners(externalSigners);
    setInternalSigners(
      (signRequest.signers || [])
        .filter((signer) => signer.is_internal && signer.user_id)
        .map((signer, index) => ({
          user_id: signer.user_id as number,
          name: signer.name || signer.email || '',
          email: signer.email || '',
          signing_order: signer.signing_order || index + 1,
          role: 'signer' as const,
        })),
    );
    });
  }, [existingSignRequestData, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !existingDocumentData?.document) return;
    const ccEmails = existingDocumentData.document.cc_emails || [];
    void Promise.resolve().then(() => setCcEmails(ccEmails));
  }, [existingDocumentData, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !existingSignRequestData?.sign_request || !selectedDocType?.require_approval) return;

    const workflowSnapshotSteps =
      existingSignRequestData.sign_request.workflow_snapshot?.steps?.map((step) => ({
        step_name: step.step_name || `Bước ${step.order}`,
        approver_type: 'user',
        approver_id: step.approver_id || null,
        participant_role: step.participant_role || 'approver',
        due_in_days: step.due_in_days || 3,
        order: step.order,
      })) || null;

    if (!workflowSnapshotSteps?.length) return;

    void Promise.resolve().then(() => {
      customizedStepsRef.current = workflowSnapshotSteps;
      setCustomizedSteps(workflowSnapshotSteps);
    });
  }, [existingSignRequestData, isEditMode, selectedDocType]);

  const fileToBase64 = (selectedFile: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
    });

  const createMutation = useMutation({
    mutationFn: async () => {
      setSubmitError(null);
      setSubmitSuccess(null);
      if (!documentTypeId) {
        throw new Error('Vui lòng chọn loại văn bản');
      }

      if (!selectedDocType || (!selectedDocType.require_approval && !selectedDocType.require_digital_signing)) {
        throw new Error('Loại văn bản không hỗ trợ luồng phê duyệt hoặc ký điện tử');
      }

      if (selectedDocType?.require_approval) {
        if (!hasConfiguredApprovalStep) {
          throw new Error('Loại văn bản này cần ít nhất một bước phê duyệt hợp lệ');
        }
      }

      if (selectedDocType.require_digital_signing && !hasConfiguredSigner) {
        throw new Error('Loại văn bản này cần ít nhất một người ký nội bộ hoặc bên ngoài');
      }

      for (const signer of signers) {
        if (!signer.email || !signer.name) {
          throw new Error('Vui lòng nhập đủ tên và email người ký ngoài');
        }
      }
      for (const signer of internalSigners) {
        if (!signer.user_id || !signer.email || !signer.name) {
          throw new Error('Vui lòng chọn người ký nội bộ hợp lệ');
        }
      }

      if (isEditMode) {
        await fetchJson(`/sign-requests/${existingSignRequestId}/draft-config`, {
          method: 'PATCH',
          body: JSON.stringify({
            signers: signers.map((signer) => ({
              id: /^\d+$/.test(signer.id) ? Number(signer.id) : null,
              email: signer.email,
              name: signer.name,
              role: signer.role || 'signer',
              external_org_id: signer.externalOrgId || null,
            })),
            internal_signers: workflowMode === 'no_approval'
              ? internalSigners.map((signer) => ({
                  user_id: signer.user_id,
                  signing_order: signer.signing_order,
                  role: 'signer',
                }))
              : undefined,
            workflow_steps:
              selectedDocType?.require_approval && workflowMode === 'flexible' ? customizedStepsRef.current : null,
          }),
        });

        if (attachments.length > 0 && existingDocumentId) {
          for (const attachment of attachments) {
            await fetchJson(`/documents/${existingDocumentId}/attachments`, {
              method: 'POST',
              body: JSON.stringify({
                file_name: attachment.name,
                file_base64: await fileToBase64(attachment),
                file_type: attachment.type,
              }),
            });
          }
        }

        if (existingDocumentId) {
          await fetchJson(`/documents/${existingDocumentId}/cc-emails`, {
            method: 'PUT',
            body: JSON.stringify({
              emails: ccEmails,
            }),
          });
        }

        return { sign_request_id: existingSignRequestId };
      }

      if (!file) {
        throw new Error('Vui lòng chọn file');
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

      if (workflowMode === 'flexible' && selectedDocType?.default_workflow_id) {
        payload.workflow_id = selectedDocType.default_workflow_id;
        payload.customized_steps = customizedStepsRef.current;
      }

      if (workflowMode === 'adhoc' && adhocStepsRef.current?.length) {
        payload.adhoc_steps = adhocStepsRef.current;
      }

      const directSigners = [
        ...internalSigners.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          order: index + 1,
          type: 'manual' as const,
        })),
        ...signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          order: internalSigners.length + index + 1,
          type: signer.type,
          external_org_id: signer.externalOrgId,
        })),
      ];
      if (directSigners.length > 0) payload.signers = directSigners;

      if (ccEmails.length > 0) payload.cc_emails = ccEmails;
      if (attachments.length > 0) {
        payload.attachments = await Promise.all(
          attachments.map(async (attachment) => ({
            file_name: attachment.name,
            file_base64: await fileToBase64(attachment),
            file_type: attachment.type,
          })),
        );
      }

      const response = await fetchJson<{ document: any }>('/documents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return response.document;
    },
    onError: (error: any) => {
      setSubmitError('Không thể lưu cấu hình trình ký. Vui lòng thử lại. Dữ liệu bạn đã nhập vẫn được giữ nguyên.');
      toast.error(error.message || 'Không thể lưu cấu hình trình ký');
    },
    onSuccess: (document: any) => {
      setSubmissionLocked(false);
      setSubmitSuccess(isEditMode ? 'Đã lưu cấu hình trình ký.' : 'Đã tạo trình ký thành công.');
      const signRequestId = Number(document?.sign_request_id);
      if (Number.isFinite(signRequestId) && signRequestId > 0) {
        toast.success(isEditMode ? 'Đã cập nhật cấu hình trình ký. Đang quay lại editor...' : 'Đã chốt cấu hình trình ký. Đang chuyển sang editor để đặt vị trí ký...');
        router.replace(`/sign-requests/${signRequestId}/editor`);
        return;
      }
      toast.error('Đã tạo tài liệu nhưng chưa lấy được luồng trình ký. Vui lòng mở lại từ danh sách.');
      router.replace('/sign-requests');
    },
    onSettled: (_data, error) => {
      if (!error) setSubmissionLocked(false);
      submittingRef.current = false;
    },
  });

  const retryCreate = () => {
    if (createMutation.isPending) return;
    submittingRef.current = true;
    setSubmissionLocked(true);
    createMutation.mutate();
  };

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges || createMutation.isPending) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [hasUnsavedChanges, createMutation.isPending]);

  return (
    <div className="space-y-6">
      {isReplacementDraft ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Luồng #{replacedSignRequestId} đã được hủy và vẫn còn trong lịch sử. Hãy upload PDF mới và chọn lại loại văn bản để tạo bản nháp thay thế.
        </div>
      ) : null}
      <PageHeader
        icon={Upload}
        title={isEditMode ? 'Chỉnh cấu hình trình ký' : 'Tạo trình ký'}
        description="Chốt tài liệu, workflow áp dụng và danh sách người ký tại đây trước khi sang editor đặt vị trí ký."
        iconColor="text-blue-600"
      />

      <form
        className="mx-auto max-w-5xl space-y-6 pb-24 sm:pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (submittingRef.current || submissionLocked || createMutation.isPending) return;
          submittingRef.current = true;
          setSubmissionLocked(true);
          createMutation.mutate();
        }}
      >
        <InlineActionFeedback error={submitError} success={submitSuccess} />
        {submitError && <AsyncErrorState message="Không thể lưu cấu hình. Dữ liệu đã nhập vẫn được giữ nguyên." onRetry={retryCreate} />}
        <nav aria-label="Các bước tạo trình ký" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map((label, index) => { const step = index + 1; const canNavigate = isEditMode || step <= currentStep; return <button key={label} type="button" onClick={() => { if (canNavigate) setCurrentStep(step); }} disabled={!canNavigate} className={`rounded-lg border p-3 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring ${step === currentStep ? 'border-blue-600 bg-blue-50 font-semibold' : canNavigate ? 'border-emerald-300 bg-emerald-50' : 'text-muted-foreground'}`}><span className="mr-2">{step < currentStep ? '✓' : step}.</span>{label}</button>; })}
        </nav>
        {currentStep === 1 && <Card>
          <CardContent className="space-y-5 p-6">
            {isEditMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Bạn đang chỉnh lại cấu hình của một draft hoặc hồ sơ bị từ chối. Sau khi lưu xong, hệ thống sẽ quay lại editor để tiếp tục đặt vị trí ký hoặc gửi lại.
              </div>
            )}

            <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-2">
              <div className="rounded-lg border border-blue-200 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">Thiết lập ở màn này</p>
                <p className="mt-1 text-sm text-slate-600">
                  Chọn file, loại văn bản, workflow áp dụng và chốt toàn bộ người tham gia trước khi sang editor.
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Làm ở editor</p>
                <p className="mt-1 text-sm text-slate-600">
                  Editor chỉ để đặt vị trí ký lên PDF. Nếu cần thêm hoặc bớt người, quay lại màn này để chỉnh.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold">1. Tài liệu và loại văn bản</h3>
              <p className="mt-1 text-sm text-slate-500">
                {isEditMode
                  ? 'Nếu cần thêm hoặc bớt người ký ngoài, hãy chỉnh ở đây rồi quay lại editor.'
                  : 'Chỉ hiển thị các loại văn bản thực sự có phê duyệt hoặc cho phép gửi ra bên ngoài để ký điện tử. Loại không cần hai luồng này sẽ không xuất hiện ở màn tạo trình ký.'}
              </p>
            </div>

            {isEditMode ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                <p className="text-lg font-medium text-slate-900">
                  {existingSignRequestData?.sign_request?.document?.original_file_name ||
                    existingSignRequestData?.sign_request?.document?.title ||
                    'Tài liệu hiện tại'}
                </p>
                <p className="mt-1 text-sm text-slate-500">Tài liệu nguồn đã được chốt. Nếu cần đổi file, hãy tạo một hồ sơ mới.</p>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-blue-400">
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(event) => { setFile(event.target.files?.[0] || null); setHasUnsavedChanges(true); }}
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
            )}

            <div className="space-y-2">
              <Label>Loại văn bản *</Label>
              <Select
                value={documentTypeId?.toString() || ''}
                onValueChange={(value) => { setDocumentTypeId(Number(value)); setHasUnsavedChanges(true); }}
                disabled={isEditMode}
              >
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
              {selectedDocType && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedDocType.require_approval && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Yêu cầu phê duyệt</span>}
                  {selectedDocType.require_digital_signing && <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">Yêu cầu ký điện tử</span>}
                </div>
              )}
              {stepErrors.file && <p className="text-sm text-destructive" role="alert">{stepErrors.file}</p>}
              {stepErrors.documentType && <p className="text-sm text-destructive" role="alert">{stepErrors.documentType}</p>}
            </div>
          </CardContent>
        </Card>}

        {currentStep === 2 && selectedDocType && (
          <Card>
            <CardContent className="space-y-5 p-6">
              <div>
                <h3 className="text-lg font-semibold">2. Workflow áp dụng</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Nếu loại văn bản đã gắn workflow mặc định thì hệ thống sẽ tự load workflow đó. Nếu workflow cho phép tùy chỉnh, anh sửa trực tiếp ngay trên danh sách bước được load ra.
                </p>
              </div>

              {workflowMode === 'no_approval' && (
                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                  Loại văn bản này không yêu cầu phê duyệt. Nếu cần chữ ký, hãy khai báo người ký ở bước 3.
                </div>
              )}

              {workflowMode === 'strict' && selectedWorkflowId && <WorkflowPreview workflowId={selectedWorkflowId} />}

              {workflowMode === 'flexible' && selectedWorkflowId && (
                <WorkflowCustomizer
                  defaultWorkflowId={selectedWorkflowId}
                  initialSteps={isEditMode ? customizedSteps : null}
                  onCustomize={(steps) => {
                    customizedStepsRef.current = steps;
                    setCustomizedSteps(steps);
                  }}
                />
              )}

              {workflowMode === 'adhoc' && (
                <div className="space-y-4">
                  {false && <div className="space-y-2">
                    <Label>Chọn workflow thủ công</Label>
                    <Select value={selectedWorkflowId?.toString() || ''} onValueChange={(value) => setSelectedWorkflowId(Number(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn một workflow có sẵn" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeWorkflows.map((workflow: any) => (
                          <SelectItem key={workflow.id} value={String(workflow.id)}>
                            {workflow.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>}

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Loại văn bản này chưa gắn workflow mặc định. Anh có thể chọn một workflow có sẵn hoặc tự tạo luồng ad-hoc bên dưới.
                  </div>

                  {true && (
                    <AdhocWorkflowBuilder
                      onBuild={(steps) => {
                        adhocStepsRef.current = steps;
                        setAdhocSteps(steps);
                      }}
                    />
                  )}
                </div>
              )}
              {stepErrors.workflow && <p className="text-sm text-destructive" role="alert">{stepErrors.workflow}</p>}
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && <Card>
          <CardContent className="space-y-6 p-6">
            <div>
              <h3 className="text-lg font-semibold">3. Người ký và thông tin bổ sung</h3>
              <p className="mt-1 text-sm text-slate-500">
                Chọn người ký nội bộ hoặc khai báo người ký bên ngoài. Chỉ cần ít nhất một người ký hợp lệ thuộc một trong hai nhóm.
              </p>
            </div>

            {(selectedDocType?.require_digital_signing || isEditMode || !selectedDocType) && (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <p>{!selectedDocType ? 'Chọn loại văn bản trước, sau đó có thể thêm người ký nội bộ hoặc bên ngoài.' : 'Có thể để trống một nhóm nếu nhóm còn lại đã có ít nhất một người ký hợp lệ. Danh sách sẽ đi cùng luồng khi mở editor.'}</p>
                  </div>
                </div>
                {workflowMode === 'no_approval' && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                    <InternalSignersSelector
                      signers={internalSigners}
                      onChange={(value) => { setInternalSigners(value); setHasUnsavedChanges(true); }}
                      allowEdit
                      signerOnly
                    />
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 p-4">
                  <SignersSection signers={signers} onChange={(value) => { setSigners(value); setHasUnsavedChanges(true); }} externalOrgs={externalOrgs || []} />
                </div>
                {Object.entries(stepErrors).some(([key]) => key.startsWith('signer-')) && <p className="text-sm text-destructive" role="alert">Vui lòng hoàn thiện thông tin người ký.</p>}
                {Object.entries(stepErrors).some(([key]) => key.startsWith('internal-signer-')) && <p className="text-sm text-destructive" role="alert">Vui lòng chọn người ký nội bộ hợp lệ.</p>}
                {stepErrors.signerRequired && <p className="text-sm text-destructive" role="alert">{stepErrors.signerRequired}</p>}
              </div>
            )}

            <div className="border-t pt-5">
              <CCEmailsSection emails={ccEmails} onChange={setCcEmails} />
            </div>

            <div className="border-t pt-5">
              {isEditMode && existingAttachments && existingAttachments.length > 0 && (
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">File đính kèm hiện có ({existingAttachments.length})</p>
                  <div className="mt-3 space-y-2">
                    {existingAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
                        <span className="truncate">{attachment.file_name}</span>
                        <span className="text-xs text-slate-500">{attachment.file_type || 'Tệp đính kèm'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <AttachmentsSection files={attachments} onChange={setAttachments} />
            </div>
          </CardContent>
        </Card>}

        {currentStep === 4 && <Card><CardContent className="space-y-4 p-6"><h3 className="text-lg font-semibold">Rà soát trước khi tạo</h3><div className="grid gap-3 text-sm sm:grid-cols-2"><p><strong>Tài liệu:</strong> {file?.name || existingSignRequestData?.sign_request?.document?.original_file_name}</p><p><strong>Loại văn bản:</strong> {selectedDocType?.name || 'Chưa chọn'}</p><p><strong>Workflow:</strong> {workflowMode === 'no_approval' ? 'Không cần phê duyệt' : workflowMode === 'adhoc' ? `${adhocSteps?.length || 0} bước tùy chỉnh` : workflowMode || 'Chưa cấu hình'}</p><p><strong>Người ký:</strong> {hasConfiguredSigner ? `${signers.length} bên ngoài, ${configuredInternalSignerCount} nội bộ` : 'Chưa có'}</p></div><p className="text-sm text-muted-foreground">Kiểm tra lại thông tin. Khi xác nhận, hệ thống sẽ tạo trình ký và chuyển tới editor để đặt trường ký.</p></CardContent></Card>}

        <div className="sticky bottom-20 z-10 -mx-1 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:mx-0 sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button
            type="button"
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep((step) => step - 1) : (isEditMode ? router.push(`/sign-requests/${existingSignRequestId}/editor`) : router.push('/sign-requests'))}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isEditMode ? 'Quay lại editor' : 'Hủy'}
          </Button>
          {currentStep < 4 ? (
            <Button type="button" onClick={nextStep} className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto">
              Tiếp tục <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
          <Button
            type="submit"
            disabled={submissionLocked || createMutation.isPending || (isEditMode && isLoadingExisting)}
            className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
          >
            {createMutation.isPending
              ? isEditMode
                ? 'Đang cập nhật...'
                : 'Đang tạo...'
              : isEditMode
                ? 'Lưu cấu hình và quay lại editor'
                : 'Tiếp tục sang editor'}
            {!createMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
          )}
        </div>
      </form>
    </div>
  );
}
