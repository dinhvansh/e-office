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
  { type: 'signature', label: 'Chá»¯ kÃ½', icon: PenLine },
  { type: 'text', label: 'Ã” nháº­p chá»¯', icon: TextCursorInput },
  { type: 'date', label: 'NgÃ y kÃ½', icon: CalendarDays },
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
    setFields(editorData.fields || []);

    const firstSignerParticipant = participants.find((participant) => participant.kind === 'signer' && participant.signer_id);
    if (firstSignerParticipant?.signer_id) {
      setSelectedSigner(firstSignerParticipant.signer_id);
    }
  }, [editorData, participants]);

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
      toast.success('ÄÃ£ gá»­i trÃ¬nh kÃ½');
      setTimeout(() => router.push('/sign-requests'), 700);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gá»­i tháº¥t báº¡i');
    },
  });

  const handlePickField = (type: Field['type']) => {
    if (isReadOnly) {
      toast.error('TÃ i liá»‡u Ä‘Ã£ gá»­i, khÃ´ng thá»ƒ chá»‰nh sá»­a vá»‹ trÃ­ kÃ½');
      return;
    }
    if (!selectedSigner) {
      toast.error('Chá»n ngÆ°á»i kÃ½ trÆ°á»›c khi Ä‘áº·t vá»‹ trÃ­');
      return;
    }
    setSelectedFieldType(type);
    toast.info('Click vÃ o PDF Ä‘á»ƒ Ä‘áº·t vá»‹ trÃ­');
  };

  const handleSave = () => {
    if (isReadOnly) {
      toast.error('TÃ i liá»‡u Ä‘Ã£ gá»­i, khÃ´ng thá»ƒ chá»‰nh sá»­a');
      return;
    }

    toast.loading('Äang lÆ°u vá»‹ trÃ­ kÃ½...', { id: 'save-fields' });
    saveFieldsMutation.mutate(fields, {
      onSuccess: () => toast.success('ÄÃ£ lÆ°u vá»‹ trÃ­ kÃ½', { id: 'save-fields' }),
      onError: (error: any) => toast.error(error.message || 'LÆ°u tháº¥t báº¡i', { id: 'save-fields' }),
    });
  };

  const handleSend = () => {
    if (isReadOnly) {
      toast.error('TÃ i liá»‡u Ä‘Ã£ gá»­i, khÃ´ng thá»ƒ gá»­i láº¡i');
      return;
    }
    if (signers.length === 0) {
      toast.error('Cáº§n cÃ³ Ã­t nháº¥t má»™t ngÆ°á»i kÃ½');
      return;
    }
    if (fields.length === 0) {
      toast.error('Cáº§n Ä‘áº·t Ã­t nháº¥t má»™t vá»‹ trÃ­ kÃ½');
      return;
    }
    if (fields.some((field) => field.required && !field.assigned_signer_id)) {
      toast.error('Táº¥t cáº£ vá»‹ trÃ­ báº¯t buá»™c pháº£i Ä‘Æ°á»£c gÃ¡n cho ngÆ°á»i kÃ½');
      return;
    }

    toast.loading('Äang lÆ°u vÃ  gá»­i trÃ¬nh kÃ½...', { id: 'send-request' });
    saveFieldsMutation.mutate(fields, {
      onSuccess: () => {
        sendMutation.mutate(undefined, {
          onSuccess: () => toast.success('ÄÃ£ gá»­i trÃ¬nh kÃ½', { id: 'send-request' }),
          onError: (error: any) => toast.error(error.message || 'Gá»­i tháº¥t báº¡i', { id: 'send-request' }),
        });
      },
      onError: (error: any) => toast.error(error.message || 'LÆ°u tháº¥t báº¡i', { id: 'send-request' }),
    });
  };

  const handleDeleteField = (index: number) => {
    if (isReadOnly) {
      toast.error('TÃ i liá»‡u Ä‘Ã£ gá»­i, khÃ´ng thá»ƒ chá»‰nh sá»­a');
      return;
    }
    setFields(fields.filter((_, itemIndex) => itemIndex !== index));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Äang táº£i editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/sign-requests/create?signRequestId=${signRequestId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay láº¡i
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="truncate text-xl font-semibold">
                    {signRequest?.document?.title || signRequest?.document?.original_file_name || 'Chá»‰nh sá»­a trÃ¬nh kÃ½'}
                  </h1>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${isEditable ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {signRequest?.status === 'rejected' ? 'Bá»‹ tá»« chá»‘i' : isEditable ? 'NhÃ¡p' : 'ÄÃ£ gá»­i'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {participants.length} ngÆ°á»i tham gia â€¢ {signers.length} ngÆ°á»i kÃ½ â€¢ {fields.length} vá»‹ trÃ­ kÃ½
                </p>
              </div>
            </div>

            {isEditable ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSave} disabled={saveFieldsMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  LÆ°u nhÃ¡p
                </Button>
                <Button onClick={handleSend} disabled={sendMutation.isPending || saveFieldsMutation.isPending} className="bg-green-600 hover:bg-green-700">
                  <Send className="mr-2 h-4 w-4" />
                  Gá»­i trÃ¬nh kÃ½
                </Button>
              </div>
            ) : (
              <div className="rounded border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                Chá»‰ xem - khÃ´ng thá»ƒ chá»‰nh sá»­a
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
                <h3 className="font-semibold">NgÆ°á»i tham gia Ä‘Ã£ chá»‘t ({participants.length})</h3>
              </div>

              {participants.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="mb-2 font-medium text-amber-900">ChÆ°a cÃ³ ngÆ°á»i tham gia Ä‘Æ°á»£c cáº¥u hÃ¬nh</p>
                  <p className="mb-3 text-amber-700">
                    Danh sÃ¡ch ngÆ°á»i tham gia cáº§n Ä‘Æ°á»£c chá»‘t tá»« bÆ°á»›c táº¡o trÃ¬nh kÃ½. Editor chá»‰ dÃ¹ng Ä‘á»ƒ Ä‘áº·t vá»‹ trÃ­ kÃ½ trÃªn PDF.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant, index) => {
                    const isSigner = participant.kind === 'signer' && !!participant.signer_id;
                    const isSelected = isSigner && selectedSigner === participant.signer_id;

                    return (
                      <button
                        key={participant.key}
                        type="button"
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'bg-white hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          if (!isReadOnly && isSigner) {
                            setSelectedSigner(participant.signer_id || null);
                          }
                        }}
                        disabled={!isSigner}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
                            {participant.order || index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold">{participant.name || participant.email}</div>
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                  participant.kind === 'signer' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {participant.kind === 'signer' ? 'KÃ½' : 'PhÃª duyá»‡t'}
                              </span>
                            </div>
                            <div className="truncate text-xs text-slate-500">{participant.email || 'KhÃ´ng cÃ³ email hiá»ƒn thá»‹'}</div>
                            {participant.kind === 'approver' && (
                              <div className="mt-1 text-[11px] text-slate-400">BÆ°á»›c nÃ y chá»‰ theo dÃµi, khÃ´ng Ä‘áº·t vá»‹ trÃ­ kÃ½.</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                <p className="mb-1 font-medium">Luá»“ng Ä‘Ãºng</p>
                <p>Muá»‘n thÃªm hoáº·c bá»›t ngÆ°á»i tham gia? HÃ£y quay láº¡i mÃ n hÃ¬nh táº¡o trÃ¬nh kÃ½ Ä‘á»ƒ chá»‰nh rá»“i quay láº¡i editor.</p>
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
                        toast.success('ÄÃ£ thÃªm vá»‹ trÃ­');
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
              <div className="rounded-lg bg-white p-8 text-center text-slate-500 shadow">KhÃ´ng tÃ¬m tháº¥y tÃ i liá»‡u.</div>
            )}

            <div className="mt-4 rounded-lg border bg-white p-4 shadow-sm xl:mt-6">
              <h4 className="mb-3 font-semibold">Vá»‹ trÃ­ Ä‘Ã£ Ä‘áº·t ({fields.length})</h4>
              {fields.length === 0 ? (
                <p className="text-sm text-slate-500">ChÆ°a cÃ³ vá»‹ trÃ­ kÃ½. Chá»n ngÆ°á»i kÃ½ bÃªn trÃ¡i, chá»n loáº¡i field bÃªn pháº£i, rá»“i click lÃªn PDF.</p>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const signer = signers.find((item) => item.id === field.assigned_signer_id);
                    return (
                      <div key={index} className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
                        <div>
                          <div className="text-sm font-medium">{getResolvedFieldLabel(field)}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Trang {field.pageIndex + 1} â€¢ x {field.xPct.toFixed(3)} â€¢ y {field.yPct.toFixed(3)} â€¢ {signer?.name || 'ChÆ°a gÃ¡n'}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteField(index)} disabled={isReadOnly}>
                          XÃ³a
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
              <h3 className="mb-3 font-semibold">CÃ´ng cá»¥ Ä‘áº·t vá»‹ trÃ­</h3>
              {isReadOnly ? (
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">TÃ i liá»‡u Ä‘Ã£ gá»­i, khÃ´ng thá»ƒ thÃªm hoáº·c sá»­a vá»‹ trÃ­.</div>
              ) : (
                <div className="space-y-2">
                  {!selectedSigner && <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">Chá»n má»™t ngÆ°á»i kÃ½ trÆ°á»›c khi Ä‘áº·t vá»‹ trÃ­.</p>}
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


