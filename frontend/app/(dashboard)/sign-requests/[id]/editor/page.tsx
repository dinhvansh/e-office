'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send, Edit, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PDFCanvasViewer } from '@/components/pdf/PDFCanvasViewer';
import { ManageSignersDialog } from '@/components/sign-requests/ManageSignersDialog';

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
    document?: {
      id: number;
      title?: string;
      original_file_name?: string;
    };
    signers?: Signer[];
  };
  fields?: Field[];
}

export default function SignRequestEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const queryClient = useQueryClient();
  const signRequestId = parseInt(params.id as string);

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<number | null>(null);
  const [showManageSigners, setShowManageSigners] = useState(false); // ✅ Phase 2

  // Fetch editor data
  const { data: editorData, isLoading } = useQuery<EditorData>({
    queryKey: ['sign-request-editor', signRequestId],
    queryFn: async () => {
      const response = await fetchJson(`/sign-requests/${signRequestId}/editor`);
      return response as EditorData;
    },
  });

  // Check if document is in draft status (editable)
  const isDraft = editorData?.signRequest?.status === 'draft';
  const isReadOnly = !isDraft;

  // Update fields when data loads
  useEffect(() => {
    if (editorData) {
      if (editorData.fields) {
        setFields(editorData.fields);
      }
      if (editorData.signRequest?.signers && editorData.signRequest.signers.length > 0) {
        setSelectedSigner(editorData.signRequest.signers[0].id);
      }
    }
  }, [editorData]);

  // Save fields mutation
  const saveFieldsMutation = useMutation({
    mutationFn: async (fieldsToSave: Field[]) => {
      return fetchJson(`/sign-requests/${signRequestId}/fields`, {
        method: 'POST',
        body: JSON.stringify({ fields: fieldsToSave }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sign-request-editor', signRequestId] });
    },
  });

  // Send sign request mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      return fetchJson(`/sign-requests/${signRequestId}/send`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      // Redirect after successful send
      setTimeout(() => {
        router.push('/sign-requests');
      }, 1000); // Small delay to show success toast
    },
  });

  const [selectedFieldType, setSelectedFieldType] = useState<Field['type']>('signature');

  const handleAddField = (type: Field['type']) => {
    if (isReadOnly) {
      toast.error('Không thể chỉnh sửa. Tài liệu đã được gửi đi.');
      return;
    }
    
    if (!selectedSigner) {
      toast.error('Please select a signer first');
      return;
    }

    setSelectedFieldType(type);
    toast.info(`Click on the PDF to place ${type} field`);
  };

  const handleSave = () => {
    if (isReadOnly) {
      toast.error('Không thể chỉnh sửa. Tài liệu đã được gửi đi.');
      return;
    }
    
    // Show loading toast
    toast.loading('Đang lưu fields...', { id: 'save-fields' });
    
    saveFieldsMutation.mutate(fields, {
      onSuccess: () => {
        toast.success('Đã lưu thành công!', { id: 'save-fields' });
      },
      onError: (error: any) => {
        toast.error(error.message || 'Lưu thất bại', { id: 'save-fields' });
      },
    });
  };

  const handleSend = () => {
    if (isReadOnly) {
      toast.error('Không thể chỉnh sửa. Tài liệu đã được gửi đi.');
      return;
    }
    
    // Require at least one field
    if (fields.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 field chữ ký trước khi gửi');
      return;
    }

    // Check all required fields are assigned
    const unassignedFields = fields.filter(f => f.required && !f.assigned_signer_id);
    if (unassignedFields.length > 0) {
      toast.error('Tất cả fields bắt buộc phải được gán cho người ký');
      return;
    }

    // Show loading toast
    toast.loading('Đang lưu và gửi email...', { id: 'send-request' });

    // Save fields first, then send
    saveFieldsMutation.mutate(fields, {
      onSuccess: () => {
        // Update loading message
        toast.loading('Đang gửi email đến người ký...', { id: 'send-request' });
        
        sendMutation.mutate(undefined, {
          onSuccess: () => {
            toast.success('Đã gửi thành công!', { id: 'send-request' });
          },
          onError: (error: any) => {
            toast.error(error.message || 'Gửi thất bại', { id: 'send-request' });
          },
        });
      },
      onError: (error: any) => {
        toast.error(error.message || 'Lưu thất bại', { id: 'send-request' });
      },
    });
  };

  const handleDeleteField = (index: number) => {
    if (isReadOnly) {
      toast.error('Không thể chỉnh sửa. Tài liệu đã được gửi đi.');
      return;
    }
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    toast.success('Field removed');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading editor...</div>
      </div>
    );
  }

  const signRequest = editorData?.signRequest;
  const signers: Signer[] = signRequest?.signers || [];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/sign-requests')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">
                  {signRequest?.document?.title || signRequest?.document?.original_file_name || 'Chỉnh sửa luồng ký'}
                </h1>
                {isDraft ? (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    📝 Nháp
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                    🔒 Đã gửi
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {signers.length} người ký • {fields.length} fields
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isDraft ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={saveFieldsMutation.isPending}
                >
                  {saveFieldsMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Lưu nháp
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sendMutation.isPending || saveFieldsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {sendMutation.isPending || saveFieldsMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Gửi đi ký
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-200">
                ⚠️ Chỉ xem - Không thể chỉnh sửa
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Signers */}
        <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Người ký ({signers.length})</h3>
            </div>
            
            {isDraft && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowManageSigners(true)}
                className="w-full mb-2"
              >
                <Users className="w-4 h-4 mr-2" />
                Quản lý người ký
              </Button>
            )}
            {!isDraft && (
              <div className="p-2 bg-amber-50 rounded text-xs text-amber-700 text-center">
                ⚠️ Đã gửi - Không thể sửa
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {signers.map((signer, index) => (
              <div
                key={signer.id}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedSigner === signer.id
                    ? 'bg-blue-50 border-blue-500 cursor-pointer'
                    : 'bg-white hover:bg-gray-50 cursor-pointer'
                }`}
                onClick={() => !isReadOnly && setSelectedSigner(signer.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{signer.name}</div>
                    <div className="text-xs text-gray-500 truncate">{signer.email}</div>
                    {signer.role && (
                      <div className="text-xs text-gray-400 mt-1">{signer.role}</div>
                    )}
                  </div>
                  {selectedSigner === signer.id && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {isDraft && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs">
              <p className="font-medium mb-1 text-blue-900">💡 Hướng dẫn</p>
              <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                <li>Chọn người ký từ danh sách</li>
                <li>Thêm fields cho người đó</li>
                <li>Lưu nháp hoặc gửi luôn</li>
              </ol>
              <p className="mt-2 pt-2 border-t border-blue-200 text-blue-700">
                <span className="font-semibold">Lưu ý:</span> Danh sách người ký được thiết lập khi upload tài liệu. Để thay đổi, cần tạo lại yêu cầu ký mới.
              </p>
            </div>
          )}
        </div>

        {/* Center - PDF Viewer & Fields */}
        <div className="flex-1 bg-gray-100 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* PDF Viewer */}
            {signRequest?.document?.id ? (
              <div className="bg-white shadow-lg rounded-lg mb-6 overflow-hidden" style={{ height: '600px' }}>
                <PDFCanvasViewer
                  fileUrl={`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${signRequest.document.id}/view`}
                  token={typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('esign.auth') || '{}')?.tokens?.accessToken || '' : ''}
                  fields={fields.map((f, i) => ({ 
                    ...f, 
                    id: `field-${i}`,
                    signer_name: signers.find(s => s.id === f.assigned_signer_id)?.name 
                  }))}
                  signers={signers.map(s => ({ 
                    id: s.id, 
                    name: s.name, 
                    email: s.email, 
                    signing_order: signers.indexOf(s) + 1 
                  }))}
                  selectedSignerId={selectedSigner || undefined}
                  selectedFieldType={selectedFieldType}
                  onFieldAdd={(field) => {
                    const newField: Field = {
                      ...field,
                      type: selectedFieldType,
                      // ✅ Use width/height from PDFCanvasViewer (already in percentage)
                      // Don't override with fixed pixel values
                      required: true,
                      label: `${selectedFieldType.charAt(0).toUpperCase() + selectedFieldType.slice(1)} Field`,
                      assigned_signer_id: selectedSigner,
                    };
                    setFields([...fields, newField]);
                    toast.success(`${selectedFieldType} field added`);
                  }}
                  onFieldMove={(id, x, y) => {
                    const index = parseInt(id.replace('field-', ''));
                    const newFields = [...fields];
                    newFields[index] = { ...newFields[index], x, y };
                    setFields(newFields);
                  }}
                  onFieldResize={(id, width, height) => {
                    const index = parseInt(id.replace('field-', ''));
                    const newFields = [...fields];
                    newFields[index] = { ...newFields[index], width, height };
                    setFields(newFields);
                  }}
                />
              </div>
            ) : (
              <div className="bg-white shadow-lg rounded-lg p-8 mb-6">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium">No document found</p>
                  <p className="text-sm">Document: {signRequest?.document?.original_file_name}</p>
                </div>
              </div>
            )}

            {/* Fields List */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Fields ({fields.length})</h4>
              {fields.length === 0 ? (
                <p className="text-sm text-gray-500">No fields added yet. Use the palette on the right to add fields.</p>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const signer = signers.find(s => s.id === field.assigned_signer_id);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm capitalize">{field.type}</span>
                            {field.required && (
                              <span className="text-xs text-red-500">*</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {field.label} • Page {field.page} • Position ({Math.round(field.x)}, {Math.round(field.y)})
                          </div>
                          {signer && (
                            <div className="text-xs text-blue-600 mt-1">
                              Assigned to: {signer.name}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteField(index)}
                          disabled={isReadOnly}
                        >
                          Delete
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Field Palette */}
        <div className="w-64 border-l bg-gray-50 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3">Field Types</h3>
          {isReadOnly ? (
            <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
              <p className="font-medium mb-2">⚠️ Chế độ chỉ xem</p>
              <p>Tài liệu đã được gửi đi. Không thể thêm hoặc chỉnh sửa fields.</p>
            </div>
          ) : (
            <>
              {!selectedSigner && (
                <p className="text-xs text-amber-600 mb-3 p-2 bg-amber-50 rounded">
                  Select a signer first
                </p>
              )}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddField('signature')}
                  disabled={!selectedSigner || isReadOnly}
                >
                  🖊️ Signature
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddField('text')}
                  disabled={!selectedSigner || isReadOnly}
                >
                  📝 Text
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddField('date')}
                  disabled={!selectedSigner || isReadOnly}
                >
                  📅 Date
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddField('checkbox')}
                  disabled={!selectedSigner || isReadOnly}
                >
                  ☑️ Checkbox
                </Button>
              </div>

              <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs">
                <p className="font-medium mb-2">How to use:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Select a signer</li>
                  <li>Click field type to add</li>
                  <li>Fields auto-assigned to selected signer</li>
                  <li>Save draft or send directly</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ Phase 2: Manage Signers Dialog */}
      <ManageSignersDialog
        signRequestId={signRequestId}
        signers={editorData?.signRequest?.signers || []}
        isOpen={showManageSigners}
        onClose={() => setShowManageSigners(false)}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['sign-request-editor', signRequestId] });
        }}
      />
    </div>
  );
}
