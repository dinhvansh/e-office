'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PenTool, Check } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';

export default function InternalSigningPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchJson } = useAuth();
  const signRequestId = parseInt(params.id as string);
  
  const [signatureData, setSignatureData] = useState<string>('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | 'typed'>('drawn');
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  // Fetch sign request details
  const { data: signRequest, isLoading } = useQuery({
    queryKey: ['sign-request', signRequestId],
    queryFn: async () => {
      const res = await fetchJson<any>(`/sign-requests/${signRequestId}`);
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
      <div className="max-w-4xl mx-auto px-4">
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

        {/* Document Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Thông tin tài liệu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Mã số:</span>
                <span className="ml-2 font-medium">
                  {signRequest?.document?.document_number || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Trạng thái:</span>
                <span className="ml-2 font-medium">{signRequest?.status}</span>
              </div>
              <div>
                <span className="text-gray-600">Số người ký:</span>
                <span className="ml-2 font-medium">
                  {signRequest?.signers?.length || 0} người
                </span>
              </div>
              <div>
                <span className="text-gray-600">Loại ký:</span>
                <span className="ml-2 font-medium">
                  {signRequest?.workflow_type === 'sequential' ? 'Tuần tự' : 'Song song'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Canvas */}
        <Card className="mb-6">
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
                  }}
                  backgroundColor="white"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={signMutation.isPending}
                >
                  Xóa
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveSignature}
                  disabled={signMutation.isPending}
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
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={signMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!signatureData || signMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
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
        </div>
      </div>
    </div>
  );
}
