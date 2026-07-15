'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, CheckSquare, PenLine, Save, Send, TextCursorInput } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { PDFCanvasViewer } from '@/components/pdf/PDFCanvasViewer';
import { Button } from '@/components/ui/button';
import { getDefaultFieldLabel, getDefaultFieldPlaceholder, getResolvedFieldLabel } from '@/lib/sign-field.helper';

interface Field {
  id?: number;
  type: 'signature' | 'text' | 'date' | 'checkbox';
  pageIndex: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  required: boolean;
  label?: string;
  placeholder?: string;
  assigned_signer_id?: number | null;
  signer_name?: string;
}

interface Signer {
  id: number;
  name: string;
  email: string;
  role?: string;
  is_internal?: boolean;
}

interface Participant {
  key: string;
  kind: 'approver' | 'signer';
  name: string;
  email: string | null;
  order: number;
  signer_id?: number;
}

interface EditorData {
  signRequest?: {
    id: number;
    title?: string;
    status?: string;
    flow_state?: string;
    document?: {
      id: number;
      title?: string;
      original_file_name?: string;
    };
    signers?: Signer[];
  };
  fields?: Field[];
  participants?: Participant[];
}

const FIELD_OPTIONS: Array<{ type: Field['type']; label: string; icon: any }> = [
  { type: 'signature', label: 'Chữ ký', icon: PenLine },
  { type: 'text', label: 'Ô nhập chữ', icon: TextCursorInput },
  { type: 'date', label: 'Ngày ký', icon: CalendarDays },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
];

export default function SignRequestEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const signRequestId = Number(params.id);

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<number | null>(null);
  const [selectedFieldType, setSelectedFieldType] = useState<Field['type']>('signature');

  const { data: editorData, isLoading } = useQuery<EditorData>({
    queryKey: ['sign-request-editor', signRequestId],
    queryFn: async () => fetchJson(`/sign-requests/${signRequestId}/editor`) as Promise<EditorData>,
  });

  const signRequest = editorData?.signRequest;
  const isEditable =
    signRequest?.flow_state === 'DRAFT' || signRequest?.status === 'draft' || signRequest?.status === 'rejected';
  const isReadOnly = !isEditable;

  const allSigners: Signer[] = signRequest?.signers || [];
  const signers = allSigners.filter((signer) => signer.role === 'signer' || !signer.role);
  const signerColors = [
    { border: 'border-blue-500', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', icon: 'bg-blue-100 text-blue-600' },
    { border: 'border-green-500', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', icon: 'bg-green-100 text-green-600' },
    { border: 'border-purple-500', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', icon: 'bg-purple-100 text-purple-600' },
    { border: 'border-orange-500', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', icon: 'bg-orange-100 text-orange-600' },
  ] as const;
  const participants: Participant[] =
    editorData?.participants?.length
      ? editorData.participants
      : signers.map((signer, index) => ({
          key: `signer-${signer.id}`,
          kind: 'signer',
          name: signer.name,
          email: signer.email,
          order: index + 1,
          signer_id: signer.id,
        }));

  useEffect(() => {
    if (!editorData) return;
    void Promise.resolve().then(() => {
      setFields(editorData.fields || []);

      const validSignerIds = new Set(
        participants
          .filter((participant) => participant.kind === 'signer' && participant.signer_id)
          .map((participant) => participant.signer_id as number)
      );

      setSelectedSigner((current) => {
        if (current && validSignerIds.has(current)) return current;
        const firstSignerParticipant = participants.find((participant) => participant.kind === 'signer' && participant.signer_id);
        return firstSignerParticipant?.signer_id || null;
      });
    });
  }, [editorData, participants, signRequestId]);

  const saveFieldsMutation = useMutation({
    mutationFn: async (fieldsToSave: Field[]) =>
      fetchJson(`/sign-requests/${signRequestId}/fields`, {
        method: 'POST',
        body: JSON.stringify({ fields: fieldsToSave }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sign-request-editor', signRequestId] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () =>
      fetchJson(`/sign-requests/${signRequestId}/send`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success('Đã gửi trình ký');
      setTimeout(() => router.push('/sign-requests'), 700);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gửi thất bại');
    },
  });

  const handlePickField = (type: Field['type']) => {
    if (isReadOnly) {
      toast.error('Tài liệu đã gửi, không thể chỉnh sửa vị trí ký');
      return;
    }
    if (!selectedSigner) {
      toast.error('Chọn người ký trước khi đặt vị trí');
      return;
    }
    setSelectedFieldType(type);
    toast.info('Click vào PDF để đặt vị trí');
  };

  const handleSave = () => {
    if (isReadOnly) {
      toast.error('Tài liệu đã gửi, không thể chỉnh sửa');
      return;
    }

    toast.loading('Đang lưu vị trí ký...', { id: 'save-fields' });
    saveFieldsMutation.mutate(fields, {
      onSuccess: () => toast.success('Đã lưu vị trí ký', { id: 'save-fields' }),
      onError: (error: any) => toast.error(error.message || 'Lưu thất bại', { id: 'save-fields' }),
    });
  };

  const handleSend = () => {
    if (isReadOnly) {
      toast.error('Tài liệu đã gửi, không thể gửi lại');
      return;
    }
    if (signers.length === 0) {
      toast.error('Cần có ít nhất một người ký');
      return;
    }
    if (fields.length === 0) {
      toast.error('Cần đặt ít nhất một vị trí ký');
      return;
    }
    if (fields.some((field) => field.required && !field.assigned_signer_id)) {
      toast.error('Tất cả vị trí bắt buộc phải được gán cho người ký');
      return;
    }

    toast.loading('Đang lưu và gửi trình ký...', { id: 'send-request' });
    saveFieldsMutation.mutate(fields, {
      onSuccess: () => {
        sendMutation.mutate(undefined, {
          onSuccess: () => toast.success('Đã gửi trình ký', { id: 'send-request' }),
          onError: (error: any) => toast.error(error.message || 'Gửi thất bại', { id: 'send-request' }),
        });
      },
      onError: (error: any) => toast.error(error.message || 'Lưu thất bại', { id: 'send-request' }),
    });
  };

  const handleDeleteField = (index: number) => {
    if (isReadOnly) {
      toast.error('Tài liệu đã gửi, không thể chỉnh sửa');
      return;
    }
    setFields(fields.filter((_, itemIndex) => itemIndex !== index));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Đang tải editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white md:sticky md:top-0 md:z-10">
        <div className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/sign-requests/create?signRequestId=${signRequestId}`)} className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="truncate text-xl font-semibold">
                    {signRequest?.document?.title || signRequest?.document?.original_file_name || 'Chỉnh sửa trình ký'}
                  </h1>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${isEditable ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {signRequest?.status === 'rejected' ? 'Bị từ chối' : isEditable ? 'Nháp' : 'Đã gửi'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {participants.length} người tham gia • {signers.length} người ký • {fields.length} vị trí ký
                </p>
              </div>
            </div>

            {isEditable ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={handleSave} disabled={saveFieldsMutation.isPending} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Lưu nháp
                </Button>
                <Button onClick={handleSend} disabled={sendMutation.isPending || saveFieldsMutation.isPending} className="w-full bg-green-600 hover:bg-green-700">
                  <Send className="mr-2 h-4 w-4" />
                  Gửi trình ký
                </Button>
              </div>
            ) : (
              <div className="rounded border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                Chỉ xem - không thể chỉnh sửa
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">
          <aside className="order-2 xl:order-1 xl:col-span-3">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Người tham gia đã chốt ({participants.length})</h3>
              </div>

              {participants.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="mb-2 font-medium text-amber-900">Chưa có người tham gia được cấu hình</p>
                  <p className="mb-3 text-amber-700">
                    Danh sách người tham gia cần được chốt từ bước tạo trình ký. Editor chỉ dùng để đặt vị trí ký trên PDF.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant, index) => {
                    const isSigner = participant.kind === 'signer' && !!participant.signer_id;
                    const isSelected = isSigner && selectedSigner === participant.signer_id;
                    const signer = isSigner ? signers.find((item) => item.id === participant.signer_id) : undefined;
                    const signerColor = isSigner
                      ? signerColors[((participant.order || index + 1) - 1) % signerColors.length]
                      : undefined;

                    return (
                      <button
                        key={participant.key}
                        type="button"
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${
                          isSelected
                            ? `${signerColor?.border || 'border-blue-500'} ${signerColor?.bg || 'bg-blue-50'} shadow-sm`
                            : isSigner
                              ? `${signerColor?.border || 'border-slate-200'} bg-white`
                              : 'bg-white hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          if (!isReadOnly && isSigner) {
                            setSelectedSigner(participant.signer_id || null);
                          }
                        }}
                        disabled={!isSigner}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                            signerColor?.icon || 'bg-blue-100 text-blue-600'
                          }`}>
                            {participant.order || index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold">{participant.name || participant.email}</div>
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                  participant.kind === 'signer'
                                    ? signerColor?.badge || 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {participant.kind === 'signer' ? 'Ký' : 'Phê duyệt'}
                              </span>
                              {participant.kind === 'signer' && signer ? (
                                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                  signer.is_internal ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {signer.is_internal ? 'Nội bộ' : 'Ngoài'}
                                </span>
                              ) : null}
                            </div>
                            <div className="truncate text-xs text-slate-500">{participant.email || 'Không có email hiển thị'}</div>
                            {participant.kind === 'approver' && (
                              <div className="mt-1 text-[11px] text-slate-400">Bước này chỉ theo dõi, không đặt vị trí ký.</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                <p className="mb-1 font-medium">Luồng đúng</p>
                <p>Muốn thêm hoặc bớt người tham gia? Hãy quay lại màn hình tạo trình ký để chỉnh rồi quay lại editor.</p>
              </div>
            </div>
          </aside>

          <main className="order-1 xl:order-2 xl:col-span-6">
            {signRequest?.document?.id ? (
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-4">
                  <div className="h-[calc(100vh-250px)] min-h-[520px] overflow-hidden rounded-lg border bg-white sm:min-h-[620px] xl:h-[760px]">
                    <PDFCanvasViewer
                      fileUrl={`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${signRequest.document.id}/view`}
                      token={typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('esign.auth') || '{}')?.tokens?.accessToken || '' : ''}
                      fields={fields.map((field, index) => ({
                        ...field,
                        id: `field-${index}`,
                        signer_name: signers.find((signer) => signer.id === field.assigned_signer_id)?.name,
                      }))}
                      signers={signers.map((signer, index) => ({
                        id: signer.id,
                        name: signer.name,
                        email: signer.email,
                        signing_order: index + 1,
                      }))}
                      selectedSignerId={selectedSigner || undefined}
                      selectedFieldType={selectedFieldType}
                      onFieldAdd={(field) => {
                        const newField: Field = {
                          ...field,
                          type: selectedFieldType,
                          required: true,
                          placeholder: getDefaultFieldPlaceholder(selectedFieldType),
                          label: getDefaultFieldLabel(selectedFieldType),
                          assigned_signer_id: selectedSigner,
                        };
                        setFields([...fields, newField]);
                        toast.success('Đã thêm vị trí');
                      }}
                      onFieldMove={(id, xPct, yPct) => {
                        const index = Number(id.replace('field-', ''));
                        const nextFields = [...fields];
                        nextFields[index] = { ...nextFields[index], xPct, yPct };
                        setFields(nextFields);
                      }}
                      onFieldResize={(id, widthPct, heightPct) => {
                        const index = Number(id.replace('field-', ''));
                        const nextFields = [...fields];
                        nextFields[index] = { ...nextFields[index], widthPct, heightPct };
                        setFields(nextFields);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-white p-8 text-center text-slate-500 shadow">Không tìm thấy tài liệu.</div>
            )}

            <div className="mt-4 rounded-lg border bg-white p-4 shadow-sm xl:mt-6">
              <h4 className="mb-3 font-semibold">Vị trí đã đặt ({fields.length})</h4>
              {fields.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có vị trí ký. Chọn người ký bên trái, chọn loại field bên phải, rồi click lên PDF.</p>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const signer = signers.find((item) => item.id === field.assigned_signer_id);
                    return (
                      <div key={index} className="flex flex-col gap-3 rounded-lg border bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{getResolvedFieldLabel(field)}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Trang {field.pageIndex + 1} • x {field.xPct.toFixed(3)} • y {field.yPct.toFixed(3)} • {signer?.name || 'Chưa gán'}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteField(index)} disabled={isReadOnly} className="w-full sm:w-auto">
                          Xóa
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>

          <aside className="order-3 xl:order-3 xl:col-span-3">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold">Công cụ đặt vị trí</h3>
              {isReadOnly ? (
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">Tài liệu đã gửi, không thể thêm hoặc sửa vị trí.</div>
              ) : (
                <div className="space-y-2">
                  {!selectedSigner && <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">Chọn một người ký trước khi đặt vị trí.</p>}
                  {FIELD_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.type}
                        variant={selectedFieldType === option.type ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => handlePickField(option.type)}
                        disabled={!selectedSigner}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


