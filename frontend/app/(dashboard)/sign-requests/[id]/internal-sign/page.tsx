'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PenTool, Check, FileText } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import InternalSigningSidebar from '@/components/signing/InternalSigningSidebar';
import { toast } from 'sonner';

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

  const handleSaveSignature = () => {
    if (sigCanvasRef.current?.isEmpty()) {
      toast.error('Vui lòng vẽ chữ ký');
      return;
    }
    const data = sigCanvasRef.current?.toDataURL('image/png');
    setSignatureData(data || '');
    toast.success('Đã lưu chữ ký');
  };

  const handleSubmit = async () => {
    if (!signatureData) {
      toast.error('Vui lòng ký trước khi gửi');
      return;
    }

    setSubmitting(true);

    try {
      const result = await fetchJson(`/sign-requests/${signRequestId}/sign-internal`, {
        method: 'POST',
        body: JSON.stringify({
          signature_data: signatureData,
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Ký tài liệu</h1>
          <p className="text-gray-600 mt-2">
            {data.sign_request.document.title || data.sign_request.document.original_file_name}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Sidebar */}
          <div className="lg:col-span-1">
            <InternalSigningSidebar
              signers={data.sign_request.signers}
              activities={[]}
              currentSignerId={mySigner.id}
              approvals={[]}
            />
          </div>

          {/* Right Column - PDF & Signature */}
          <div className="lg:col-span-2 space-y-6">
            {/* PDF Viewer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Xem tài liệu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  <div className="relative w-full h-[600px]">
                    <iframe
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${data.sign_request.document.id}/view`}
                      className="w-full h-full"
                      title="Document Preview"
                      style={{ border: 'none' }}
                    />
                  </div>
                  <div className="p-2 bg-gray-50 border-t flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${data.sign_request.document.id}/download`,
                          '_blank'
                        );
                      }}
                    >
                      Tải xuống PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Signature Canvas */}
            {!alreadySigned && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="w-5 h-5" />
                    Chữ ký của bạn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleClear}
                        disabled={submitting}
                        className="flex-1"
                      >
                        Xóa
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleSaveSignature}
                        disabled={submitting}
                        className="flex-1"
                      >
                        Lưu chữ ký
                      </Button>
                    </div>

                    {/* Preview */}
                    {signatureData && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Xem trước:</p>
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <img
                            src={signatureData}
                            alt="Signature preview"
                            className="max-h-24 mx-auto"
                          />
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex flex-col gap-2 pt-4 border-t">
                      <Button
                        onClick={handleSubmit}
                        disabled={!signatureData || submitting}
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
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Already Signed Message */}
            {alreadySigned && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Đã ký thành công
                  </h3>
                  <p className="text-green-700 mb-4">
                    Bạn đã ký tài liệu này vào {new Date(mySigner.signed_at).toLocaleString('vi-VN')}
                  </p>
                  <Button onClick={() => router.push('/sign-requests')}>
                    Quay về danh sách
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
