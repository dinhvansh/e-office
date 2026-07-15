'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PenTool, Check, FileText, CheckCircle, Clock } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import ApprovalHistory from '@/components/signing/ApprovalHistory';

type InternalSignRequest = {
  status: string | null;
  workflow_type: string | null;
  signers: Array<{
    id: number;
    signing_order: number | null;
    name: string | null;
    email: string | null;
    status: string | null;
  }>;
  document: {
    id: number;
    title: string | null;
    original_file_name: string | null;
    document_number: string | null;
    approvals: Array<{
      id: number;
      status: string;
      comments?: string | null;
      approved_at?: string | null;
      rejected_at?: string | null;
      approver: {
        id: number;
        full_name: string;
        email: string;
        avatar_url?: string | null;
      };
    }>;
  } | null;
};

export default function InternalSigningPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const signRequestId = parseInt(params.id as string);

  // Redirect to internal signing page
  useEffect(() => {
    router.replace(`/sign-requests/${signRequestId}/internal-sign`);
  }, [signRequestId, router]);
  
  const [signatureData, setSignatureData] = useState<string>('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | 'typed'>('drawn');
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  // Fetch sign request details
  const { data: signRequest, isLoading } = useQuery({
    queryKey: ['sign-request', signRequestId],
    queryFn: async () => {
      const res = await fetchJson<{ sign_request: InternalSignRequest }>(`/sign-requests/${signRequestId}`);
      return res.sign_request;
    }
  });

  // Sign mutation
  const signMutation = useMutation({
    mutationFn: async () => {
      if (!signatureData) {
        throw new Error('Vui lòng ký trước khi gửi');
      }

      return await fetchJson(`/sign-requests/${signRequestId}/sign-internal`, {
        method: 'POST',
        body: JSON.stringify({
          signature_data: signatureData,
          signature_type: signatureType
        })
      });
    },
    onSuccess: (data: any) => {
      toast.success(data.message || 'Ký thành công!');
      setTimeout(() => {
        router.push('/my-tasks');
      }, 1500);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra khi ký');
    }
  });

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

  const handleSubmit = () => {
    if (!signatureData) {
      toast.error('Vui lòng ký trước khi gửi');
      return;
    }
    signMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

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
            {signRequest?.document?.title || signRequest?.document?.original_file_name || 'Tài liệu'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Approvals & Signers */}
          <div className="lg:col-span-1 space-y-6">
            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thông tin tài liệu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Mã số:</span>
                    <div className="font-medium mt-1">
                      {signRequest?.document?.document_number || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Trạng thái:</span>
                    <div className="font-medium mt-1">{signRequest?.status}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Số người ký:</span>
                    <div className="font-medium mt-1">
                      {signRequest?.signers?.length || 0} người
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Loại ký:</span>
                    <div className="font-medium mt-1">
                      {signRequest?.workflow_type === 'sequential' ? 'Tuần tự' : 'Song song'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approval History */}
            {signRequest?.document?.approvals && signRequest.document.approvals.length > 0 && (
              <ApprovalHistory approvals={signRequest.document.approvals} />
            )}

            {/* Signers List */}
            {signRequest?.signers && signRequest.signers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PenTool className="w-5 h-5" />
                    Danh sách người ký
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {signRequest.signers.map((signer, index) => (
                      <div
                        key={signer.id}
                        className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                          {signer.signing_order || index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {signer.name || signer.email}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {signer.email}
                          </p>
                          <div className="mt-1">
                            {signer.status === 'signed' || signer.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                                <CheckCircle className="w-3 h-3" />
                                Đã ký
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                <Clock className="w-3 h-3" />
                                Chờ ký
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - PDF Viewer & Signature */}
          <div className="lg:col-span-2 space-y-6">

            {/* PDF Viewer */}
            {signRequest?.document?.id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Xem tài liệu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden bg-gray-100">
                    <iframe
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${signRequest.document.id}/view`}
                      className="w-full h-[700px]"
                      title="Document Preview"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Signature Canvas */}
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
                        style: { backgroundColor: 'white' },
                      }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleClear}
                      disabled={signMutation.isPending}
                      className="flex-1"
                    >
                      Xóa
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSaveSignature}
                      disabled={signMutation.isPending}
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
                        <Image
                          src={signatureData}
                          alt="Signature preview"
                          width={500}
                          height={96}
                          unoptimized
                          className="max-h-24 mx-auto"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    <Button
                      onClick={handleSubmit}
                      disabled={!signatureData || signMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {signMutation.isPending ? (
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
                      disabled={signMutation.isPending}
                      className="w-full"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
