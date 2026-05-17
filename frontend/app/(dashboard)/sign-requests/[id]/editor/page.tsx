'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, CheckSquare, MessageSquare, PenLine, Save, Send, TextCursorInput, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/auth-provider';
import { PDFCanvasViewer } from '@/components/pdf/PDFCanvasViewer';
import { ManageSignersDialog } from '@/components/sign-requests/ManageSignersDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Field {
  id?: number;
  type: 'signature' | 'text' | 'date' | 'checkbox';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
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
}

interface DiscussionComment {
  id: number;
  body: string;
  created_at: string;
  user?: {
    id: number;
    full_name?: string | null;
    email?: string | null;
  } | null;
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
  const [showManageSigners, setShowManageSigners] = useState(false);
  const [commentBody, setCommentBody] = useState('');

  const { data: editorData, isLoading } = useQuery<EditorData>({
    queryKey: ['sign-request-editor', signRequestId],
    queryFn: async () => fetchJson(`/sign-requests/${signRequestId}/editor`) as Promise<EditorData>,
  });

  const { data: discussionData } = useQuery<{ comments: DiscussionComment[] }>({
    queryKey: ['sign-request-comments', signRequestId],
    queryFn: async () => fetchJson(`/sign-requests/${signRequestId}/comments`) as Promise<{ comments: DiscussionComment[] }>,
  });

  const signRequest = editorData?.signRequest;
  const isDraft = signRequest?.flow_state === 'DRAFT' || signRequest?.status === 'draft';
  const isReadOnly = !isDraft;
  const allSigners: Signer[] = signRequest?.signers || [];
  const signers = allSigners.filter((signer) => signer.role === 'signer' || !signer.role);
  const comments = discussionData?.comments || [];

  useEffect(() => {
    if (!editorData) return;
    setFields(editorData.fields || []);

    const firstSigner = editorData.signRequest?.signers?.find((signer) => signer.role === 'signer' || !signer.role);
    if (firstSigner) {
      setSelectedSigner(firstSigner.id);
    }
  }, [editorData]);

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

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) =>
      fetchJson(`/sign-requests/${signRequestId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setCommentBody('');
      queryClient.invalidateQueries({ queryKey: ['sign-request-comments', signRequestId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Không thể thêm bình luận');
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

  const handleAddComment = () => {
    const body = commentBody.trim();
    if (!body) return;
    addCommentMutation.mutate(body);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Đang tải editor...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/sign-requests')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="truncate text-xl font-semibold">
                  {signRequest?.document?.title || signRequest?.document?.original_file_name || 'Chỉnh sửa trình ký'}
                </h1>
                <span className={`rounded px-2 py-1 text-xs font-medium ${isDraft ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isDraft ? 'Nháp' : 'Đã gửi'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {signers.length} người ký - {fields.length} vị trí ký
              </p>
            </div>
          </div>

          {isDraft ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={saveFieldsMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Lưu nháp
              </Button>
              <Button onClick={handleSend} disabled={sendMutation.isPending || saveFieldsMutation.isPending} className="bg-green-600 hover:bg-green-700">
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-72 overflow-y-auto border-r bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Người ký ({signers.length})</h3>
          </div>

          {isDraft && (
            <Button size="sm" variant="outline" onClick={() => setShowManageSigners(true)} className="mb-3 w-full">
              <Users className="mr-2 h-4 w-4" />
              Quản lý người ký
            </Button>
          )}

          {signers.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="mb-2 font-medium text-amber-900">Chưa có người ký</p>
              <p className="mb-3 text-amber-700">
                Nếu loại văn bản đã có workflow, hệ thống sẽ tự kéo người ký từ các bước có vai trò ký. Nếu chưa có, thêm người ký tại đây.
              </p>
              {isDraft && (
                <Button size="sm" onClick={() => setShowManageSigners(true)} className="w-full bg-amber-600 hover:bg-amber-700">
                  <Users className="mr-2 h-4 w-4" />
                  Thêm người ký
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {signers.map((signer, index) => (
                <button
                  key={signer.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedSigner === signer.id ? 'border-blue-500 bg-blue-50' : 'bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => !isReadOnly && setSelectedSigner(signer.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{signer.name || signer.email}</div>
                      <div className="truncate text-xs text-slate-500">{signer.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            <p className="mb-1 font-medium">Luồng đúng</p>
            <p>Tạo trình ký xong sẽ vào editor. Nếu workflow đã có người ký, bạn chỉ cần chọn người ký và đặt vị trí ký trên PDF.</p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl">
            {signRequest?.document?.id ? (
              <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-lg" style={{ height: '620px' }}>
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
                      label: FIELD_OPTIONS.find((option) => option.type === selectedFieldType)?.label || 'Vị trí ký',
                      assigned_signer_id: selectedSigner,
                    };
                    setFields([...fields, newField]);
                    toast.success('Đã thêm vị trí');
                  }}
                  onFieldMove={(id, x, y) => {
                    const index = Number(id.replace('field-', ''));
                    const nextFields = [...fields];
                    nextFields[index] = { ...nextFields[index], x, y };
                    setFields(nextFields);
                  }}
                  onFieldResize={(id, width, height) => {
                    const index = Number(id.replace('field-', ''));
                    const nextFields = [...fields];
                    nextFields[index] = { ...nextFields[index], width, height };
                    setFields(nextFields);
                  }}
                />
              </div>
            ) : (
              <div className="rounded-lg bg-white p-8 text-center text-slate-500 shadow">
                Không tìm thấy tài liệu.
              </div>
            )}

            <div className="rounded-lg border bg-white p-4">
              <h4 className="mb-3 font-semibold">Vị trí đã đặt ({fields.length})</h4>
              {fields.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có vị trí ký. Chọn người ký bên trái, chọn loại field bên phải, rồi click lên PDF.</p>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const signer = signers.find((item) => item.id === field.assigned_signer_id);
                    return (
                      <div key={index} className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
                        <div>
                          <div className="text-sm font-medium">{field.label || field.type}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Trang {field.page} - ({Math.round(field.x)}, {Math.round(field.y)}) - {signer?.name || 'Chưa gán'}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteField(index)} disabled={isReadOnly}>
                          Xóa
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="w-80 overflow-y-auto border-l bg-slate-50 p-4">
          <h3 className="mb-3 font-semibold">Công cụ đặt vị trí</h3>
          {isReadOnly ? (
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              Tài liệu đã gửi, không thể thêm hoặc sửa vị trí.
            </div>
          ) : (
            <div className="space-y-2">
              {!selectedSigner && (
                <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">Chọn người ký trước khi đặt vị trí.</p>
              )}
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

          <div className="mt-6 border-t pt-4">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-600" />
              <h3 className="font-semibold">Thảo luận</h3>
            </div>
            <div className="mb-3 max-h-72 space-y-3 overflow-y-auto rounded-lg border bg-white p-3">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có bình luận.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate font-medium text-slate-700">
                        {comment.user?.full_name || comment.user?.email || 'Người dùng'}
                      </span>
                      <span>{new Date(comment.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
                  </div>
                ))
              )}
            </div>
            <Textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Nhập bình luận về luồng ký..."
              rows={3}
            />
            <Button className="mt-2 w-full" onClick={handleAddComment} disabled={!commentBody.trim() || addCommentMutation.isPending}>
              {addCommentMutation.isPending ? 'Đang gửi...' : 'Gửi bình luận'}
            </Button>
          </div>
        </aside>
      </div>

      <ManageSignersDialog
        signRequestId={signRequestId}
        signers={editorData?.signRequest?.signers || []}
        isOpen={showManageSigners}
        onClose={() => setShowManageSigners(false)}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['sign-request-editor', signRequestId] });
        }}
        fetchJson={fetchJson}
        allowReorder={isDraft}
      />
    </div>
  );
}
