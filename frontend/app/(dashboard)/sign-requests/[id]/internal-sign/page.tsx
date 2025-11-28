'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PenTool, Check, FileText, Download } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import InternalSigningSidebar from '@/components/signing/InternalSigningSidebar';
import { toast } from 'sonner';

// Simple PDF Viewer Component
function PDFViewer({ documentId }: { documentId: number }) {
  const { fetchJson } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPDF();
  }, [documentId]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch PDF as blob with authentication
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/documents/${documentId}/view`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Không thể tải PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/documents/${documentId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
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

interface SigningData {
  sign_request: {
    id: number;
    title: string;
    message: string;
    workflow_type: string;
    document: {
      id: number;
      title: string;
      original_file_name: string;
      document_number: string;
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
  };
}

export default function InternalSigningPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson, user } = useAuth();
  const signRequestId = parseInt(params.id as string);
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SigningData | null>(null);
  const [signatureData, setSignatureData] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mySigner, setMySigner] = useState<any>(null);

  useEffect(() => {
    fetchSigningData();
  }, [signRequestId]);

  const fetchSigningData = async () => {
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
    // Check if canvas is empty
    if (sigCanvasRef.current?.isEmpty()) {
      toast.error('Vui lòng vẽ chữ ký trước khi gửi');
      return;
    }

    // Get signature data from canvas
    const currentSignature = sigCanvasRef.current?.toDataURL('image/png');
    if (!currentSignature) {
      toast.error('Không thể lấy chữ ký');
      return;
    }

    setSubmitting(true);

    try {
      const result = await fetchJson(`/sign-requests/${signRequestId}/sign-internal`, {
        method: 'POST',
        body: JSON.stringify({
          signature_data: currentSignature,
          signature_type: 'drawn'
        })
      });
      
      toast.success((result as any).message || 'Ký thành công!');
      
      // Reload to show updated status
      setTimeout(() => {
        router.push('/sign-requests');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Sidebar */}
          <div className="lg:col-span-1">
            <InternalSigningSidebar
              signers={data.sign_request.signers}
              activities={[]}
              currentSignerId={mySigner.id}
              approvals={[]}
            />
          </div>

          {/* Center: PDF Viewer */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Xem tài liệu
                </h2>
              </div>
              <div className="p-4">
                <PDFViewer documentId={data.sign_request.document.id} />
              </div>
            </div>
          </div>

          {/* Right: Signature Panel */}
          <div className="lg:col-span-1">
            {!alreadySigned ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-gray-600" />
                    Chữ ký của bạn
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  {/* Canvas */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={sigCanvasRef}
                      canvasProps={{
                        className: 'w-full h-48 cursor-crosshair',
                        style: { background: 'white' }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Vẽ chữ ký của bạn ở trên, sau đó bấm "Hoàn tất ký"
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleClear}
                      disabled={submitting}
                      className="w-full"
                      size="sm"
                    >
                      Xóa và vẽ lại
                    </Button>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
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
                          Hoàn tất ký
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
                  <Button onClick={() => router.push('/sign-requests')} size="sm">
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
