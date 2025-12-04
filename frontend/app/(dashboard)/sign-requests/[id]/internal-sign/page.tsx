'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PenTool, Check, FileText, Download } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import InternalSigningSidebar from '@/components/signing/InternalSigningSidebar';
import PDFSigningViewer from '@/components/pdf/PDFSigningViewer';
import { toast } from 'sonner';

// Simple PDF Viewer Component with Auto-refresh
function PDFViewer({ documentId, signRequestStatus, signedFilePath, accessToken }: { 
  documentId: number; 
  signRequestStatus?: string; 
  signedFilePath?: string;
  accessToken?: string;
}) {
  const { fetchJson } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-reload PDF when signed_file_path changes (progressive PDF updated)
  useEffect(() => {
    if (accessToken) {
      loadPDF();
    }
  }, [documentId, signRequestStatus, signedFilePath, accessToken]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ Use signed file if available (progressive or completed)
      const hasSignedFile = signedFilePath && signedFilePath.length > 0;
      const endpoint = hasSignedFile 
        ? `/documents/${documentId}/view-signed` 
        : `/documents/${documentId}/view`;
      
      // Add timestamp to bust cache
      const timestamp = Date.now();
      const cacheBuster = hasSignedFile ? `?t=${timestamp}` : '';
      
      // Fetch PDF as blob with authentication
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}${cacheBuster}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Không thể tải PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Revoke old URL to prevent memory leak
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      setPdfUrl(url);
    } catch (err: any) {
      console.error('PDF load error:', err);
      setError(err.message || 'Không thể tải PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${documentId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) throw new Error('Không thể tải xuống');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Đã tải xuống PDF');
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải xuống');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-red-50 rounded-lg border border-red-200">
        <FileText className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-red-600 font-medium mb-2">Không thể tải PDF</p>
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <Button onClick={loadPDF} variant="outline">
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden bg-gray-100">
        <iframe
          src={pdfUrl || ''}
          className="w-full h-[600px]"
          title="Document Preview"
          style={{ border: 'none' }}
        />
      </div>
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4 mr-2" />
          Tải xuống PDF
        </Button>
      </div>
    </div>
  );
}

interface SignatureField {
  id: number;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  assigned_signer_id?: number;
}

interface SigningData {
  sign_request: {
    id: number;
    title: string;
    message: string;
    workflow_type: string;
    status: string;
    document: {
      id: number;
      title: string;
      original_file_name: string;
      document_number: string;
      file_path: string;
      signed_file_path?: string;
    };
    signers: Array<{
      id: number;
      user_id?: number;
      name: string;
      email: string;
      status: string;
      signed_at?: string;
      role: string;
      signing_order?: number;
    }>;
    fields: SignatureField[];
  };
}

export default function InternalSigningPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson, user, tokens } = useAuth();
  const signRequestId = parseInt(params.id as string);
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SigningData | null>(null);
  const [signatureData, setSignatureData] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mySigner, setMySigner] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [myFields, setMyFields] = useState<SignatureField[]>([]);
  const [currentFieldId, setCurrentFieldId] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [guidedMode, setGuidedMode] = useState(true);  // Enable guided mode
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [completedFields, setCompletedFields] = useState<number[]>([]);
  const [fieldSignatures, setFieldSignatures] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchSigningData();
    
    // Auto-refresh every 10 seconds if sign request is in progress
    const interval = setInterval(() => {
      if (data?.sign_request?.status === 'in_progress') {
        fetchSigningData(true); // Pass true to allow refresh
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [signRequestId, data?.sign_request?.status]);

  const fetchSigningData = async (forceRefresh = false) => {
    // Guard: only fetch once unless force refresh
    if (data && !forceRefresh) return;
    
    try {
      const result = await fetchJson<SigningData>(`/sign-requests/${signRequestId}`);
      
      // Find current user's signer record
      const currentSigner = result.sign_request.signers?.find(
        (s: any) => s.user_id === user?.id
      );

      if (!currentSigner) {
        toast.error('Bạn không phải là người ký của tài liệu này');
        router.push('/sign-requests');
        return;
      }

      setMySigner(currentSigner);
      setData(result);

      // Filter fields assigned to current signer
      const fieldsForMe = result.sign_request.fields?.filter(
        (f: SignatureField) => f.assigned_signer_id === currentSigner.id
      ) || [];
      console.log('📝 Total fields:', result.sign_request.fields?.length);
      console.log('📝 My fields:', fieldsForMe.length, fieldsForMe);
      console.log('👤 Current signer ID:', currentSigner.id);
      setMyFields(fieldsForMe);

      // Load PDF - use signed version if available
      if (result.sign_request.document.file_path) {
        setPdfLoading(true);
        try {
          // Check if signed file exists
          const hasSignedFile = result.sign_request.document.signed_file_path && 
                                result.sign_request.document.signed_file_path.length > 0;
          
          const endpoint = hasSignedFile 
            ? `/documents/${result.sign_request.document.id}/view-signed`
            : `/documents/${result.sign_request.document.id}/view`;
          
          // Add timestamp to bust cache
          const timestamp = Date.now();
          const cacheBuster = hasSignedFile ? `?t=${timestamp}` : '';
          
          const pdfResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}${cacheBuster}`,
            {
              headers: {
                'Authorization': `Bearer ${tokens?.accessToken}`
              }
            }
          );
          if (pdfResponse.ok) {
            const blob = await pdfResponse.blob();
            
            // Revoke old URL to prevent memory leak
            if (pdfUrl) {
              URL.revokeObjectURL(pdfUrl);
            }
            
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
          }
        } catch (err) {
          console.error('PDF load error:', err);
        } finally {
          setPdfLoading(false);
        }
      }

      // Check if already signed
      if (currentSigner.status === 'signed' || currentSigner.status === 'completed') {
        toast.success('Bạn đã ký tài liệu này rồi');
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải dữ liệu');
      router.push('/sign-requests');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    sigCanvasRef.current?.clear();
    setSignatureData('');
  };

  const handleSubmit = async () => {
    // Check if all fields are completed
    if (myFields.length > 0 && completedFields.length < myFields.length) {
      toast.error(`Vui lòng hoàn thành tất cả ${myFields.length} vùng ký`);
      return;
    }

    setSubmitting(true);

    try {
      // Send field_signatures object (new format)
      const result = await fetchJson(`/sign-requests/${signRequestId}/sign-internal`, {
        method: 'POST',
        body: JSON.stringify({
          field_signatures: fieldSignatures,
          signature_type: 'drawn'
        })
      });
      
      toast.success((result as any).message || 'Ký thành công!');
      
      // Turn off guided mode
      setGuidedMode(false);
      
      // Refetch data to update PDF with signatures
      await fetchSigningData(true);
      
      // Redirect to my-tasks page
      setTimeout(() => {
        router.push('/my-tasks');
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Submit failed:', error);
      toast.error(error.message || 'Không thể ký tài liệu');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!data || !mySigner) {
    return null;
  }

  // Check if already signed
  const alreadySigned = mySigner.status === 'signed' || mySigner.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <h1 className="text-xl font-semibold">
                    {data.sign_request.document.title || data.sign_request.document.original_file_name}
                  </h1>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {data.sign_request.document.document_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {alreadySigned ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Đã ký</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
                  <PenTool className="w-4 h-4" />
                  <span className="text-sm font-medium">Chờ ký</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Sidebar */}
          <div className="lg:col-span-2">
            <InternalSigningSidebar
              signers={data.sign_request.signers}
              activities={[]}
              currentSignerId={mySigner.id}
              approvals={[]}
            />
          </div>

          {/* Center: PDF Viewer with Signature Fields */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Xem tài liệu
                </h2>
                {myFields.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Click vào vùng màu xanh để ký
                  </p>
                )}
              </div>
              <div className="p-4">
                {pdfUrl && myFields.length > 0 ? (
                  <PDFSigningViewer
                    pdfUrl={pdfUrl}
                    fields={alreadySigned ? [] : myFields}
                    signerId={mySigner.id}
                    onFieldClick={(field) => {
                      console.log('Field clicked:', field);
                    }}
                    guidedMode={false}
                    currentFieldId={undefined}
                    completedFieldIds={completedFields}
                    existingFieldValues={fieldSignatures}
                    onFieldComplete={(fieldId, signature) => {
                      console.log('Field completed:', fieldId);
                      setFieldSignatures(prev => ({ ...prev, [fieldId]: signature }));
                      setCompletedFields(prev => [...prev, fieldId]);
                      
                      // Move to next field in guided mode
                      if (guidedMode && currentFieldIndex < myFields.length - 1) {
                        setCurrentFieldIndex(prev => prev + 1);
                      }
                    }}
                  />
                ) : pdfUrl ? (
                  <PDFViewer 
                    documentId={data.sign_request.document.id} 
                    signRequestStatus={data.sign_request.status}
                    signedFilePath={data.sign_request.document.signed_file_path}
                    accessToken={tokens?.accessToken}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Đang tải PDF...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Signature Panel or Download */}
          <div className="lg:col-span-3">
            {!alreadySigned ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-gray-600" />
                    Tiến độ ký
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  {/* Progress */}
                  {myFields.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Đã hoàn thành</span>
                        <span className="font-semibold text-blue-600">
                          {completedFields.length} / {myFields.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(completedFields.length / myFields.length) * 100}%` }}
                        />
                      </div>
                      
                      {/* Field list */}
                      <div className="space-y-2 mt-4">
                        {myFields.map((field, idx) => {
                          const isCompleted = completedFields.includes(field.id);
                          const isCurrent = guidedMode && idx === currentFieldIndex;
                          return (
                            <div 
                              key={field.id}
                              className={`flex items-center gap-2 p-2 rounded text-sm ${
                                isCurrent ? 'bg-blue-50 border border-blue-200' :
                                isCompleted ? 'bg-green-50' : 'bg-gray-50'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : isCurrent ? (
                                <div className="w-4 h-4 rounded-full border-2 border-blue-600 animate-pulse" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                              )}
                              <span className={isCompleted ? 'text-green-700' : 'text-gray-700'}>
                                {field.type === 'signature' ? '✍️ Chữ ký' : '📝 Văn bản'} - Trang {field.page}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-3">
                        💡 Click vào vùng màu vàng trên PDF để ký
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || completedFields.length < myFields.length}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Đang ký...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Hoàn tất ký ({completedFields.length}/{myFields.length})
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={submitting}
                      className="w-full"
                      size="sm"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg shadow-sm">
                <div className="p-6 text-center">
                  <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Đã ký thành công
                  </h3>
                  <p className="text-green-700 mb-4 text-sm">
                    Bạn đã ký tài liệu này vào {new Date(mySigner.signed_at).toLocaleString('vi-VN')}
                  </p>
                  
                  {/* Check if all signers completed */}
                  {data.sign_request.signers.every(s => s.status === 'signed' || s.status === 'completed') && (
                    <div className="mb-4 p-4 bg-white rounded-lg border border-green-300">
                      <p className="text-sm text-gray-700 mb-3">
                        ✅ Tất cả người ký đã hoàn thành. Bạn có thể tải xuống tài liệu đã ký.
                      </p>
                      <Button 
                        onClick={async () => {
                          try {
                            // Public routes don't have /api/v1 prefix
                            if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
                              throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is required');
                            }
                            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '');
                            const response = await fetch(
                              `${apiBaseUrl}/public/sign/${mySigner.signing_token}/download-signed`
                            );
                            
                            if (!response.ok) {
                              throw new Error('Không thể tải xuống');
                            }
                            
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${data.sign_request.document.document_number}_signed.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            
                            toast.success('Đã tải xuống tài liệu đã ký');
                          } catch (error: any) {
                            toast.error(error.message || 'Không thể tải xuống');
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Tải xuống tài liệu đã ký
                      </Button>
                    </div>
                  )}
                  
                  <Button onClick={() => router.push('/sign-requests')} size="sm" variant="outline">
                    Quay về danh sách
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
