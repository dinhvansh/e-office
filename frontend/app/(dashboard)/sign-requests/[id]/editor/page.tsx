'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PDFCanvasViewer } from '@/components/pdf/PDFCanvasViewer';

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

  // Fetch editor data
  const { data: editorData, isLoading } = useQuery<EditorData>({
    queryKey: ['sign-request-editor', signRequestId],
    queryFn: async () => {
      const response = await fetchJson(`/sign-requests/${signRequestId}/editor`);
      return response as EditorData;
    },
  });

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
      toast.success('Fields saved successfully');
      queryClient.invalidateQueries({ queryKey: ['sign-request-editor', signRequestId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save fields');
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
      toast.success('Sign request sent successfully!');
      router.push('/sign-requests');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send sign request');
    },
  });

  const [selectedFieldType, setSelectedFieldType] = useState<Field['type']>('signature');

  const handleAddField = (type: Field['type']) => {
    if (!selectedSigner) {
      toast.error('Please select a signer first');
      return;
    }

    setSelectedFieldType(type);
    toast.info(`Click on the PDF to place ${type} field`);
  };

  const handleSave = () => {
    saveFieldsMutation.mutate(fields);
  };

  const handleSend = () => {
    if (fields.length === 0) {
      toast.error('Please add at least one field before sending');
      return;
    }

    const unassignedFields = fields.filter(f => f.required && !f.assigned_signer_id);
    if (unassignedFields.length > 0) {
      toast.error('All required fields must be assigned to a signer');
      return;
    }

    // Save first, then send
    saveFieldsMutation.mutate(fields, {
      onSuccess: () => {
        sendMutation.mutate();
      },
    });
  };

  const handleDeleteField = (index: number) => {
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
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/sign-requests')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{signRequest?.title || 'Sign Request Editor'}</h1>
              <p className="text-sm text-gray-500">
                Document: {signRequest?.document?.title || signRequest?.document?.original_file_name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saveFieldsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || saveFieldsMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Send for Signing
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Signers */}
        <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3">Signers</h3>
          <div className="space-y-2">
            {signers.map((signer) => (
              <div
                key={signer.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSigner === signer.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => setSelectedSigner(signer.id)}
              >
                <div className="font-medium text-sm">{signer.name}</div>
                <div className="text-xs text-gray-500">{signer.email}</div>
                {signer.role && (
                  <div className="text-xs text-gray-400 mt-1">{signer.role}</div>
                )}
              </div>
            ))}
          </div>
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
                      width: selectedFieldType === 'signature' ? 200 : selectedFieldType === 'checkbox' ? 30 : 150,
                      height: selectedFieldType === 'signature' ? 80 : selectedFieldType === 'checkbox' ? 30 : 40,
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
              disabled={!selectedSigner}
            >
              🖊️ Signature
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleAddField('text')}
              disabled={!selectedSigner}
            >
              📝 Text
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleAddField('date')}
              disabled={!selectedSigner}
            >
              📅 Date
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleAddField('checkbox')}
              disabled={!selectedSigner}
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
        </div>
      </div>
    </div>
  );
}
