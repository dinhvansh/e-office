'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SignatureModal from '@/components/signature/SignatureModal';
import PDFSigningViewer from '@/components/pdf/PDFSigningViewer';
import { toast } from 'sonner';
import { CheckCircle, FileText, Mail, User, Clock } from 'lucide-react';

interface SigningData {
  signer: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  sign_request: {
    id: number;
    title: string;
    message: string;
    deadline: string;
  };
  document: {
    id: number;
    title: string;
    original_file_name: string;
  };
  fields: any[];
  already_signed?: boolean;
  signed_at?: string;
}

export default function PublicSigningPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SigningData | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | 'typed'>('drawn');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSigningData();
  }, [token]);

  const fetchSigningData = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000';
      const res = await fetch(`${apiBase}/public/sign/${token}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to load signing data');
      }

      setData(result.data);
      setEmail(result.data.signer.email);

      // Check if already signed
      if (result.data.already_signed) {
        toast.success('Bạn đã ký tài liệu này rồi');
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000';
      const res = await fetch(
        `${apiBase}/public/sign/${token}/send-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to send OTP');
      }

      setOtpSent(true);
      toast.success('Mã OTP đã được gửi đến email của bạn');
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi OTP');
    }
  };

  const handleOpenSignatureModal = () => {
    if (!otp || otp.length !== 6) {
      toast.error('Vui lòng nhập mã OTP');
      return;
    }
    setShowSignatureModal(true);
  };

  const handleSignatureConfirm = (data: string, type: 'drawn' | 'uploaded' | 'typed') => {
    setSignatureData(data);
    setSignatureType(type);
    setShowSignatureModal(false);
    toast.success('Chữ ký đã được lưu. Nhấn "Hoàn tất ký" để gửi.');
  };

  const handleSubmitSignature = async () => {
    if (!signatureData) {
      toast.error('Vui lòng ký tài liệu trước');
      return;
    }

    setSubmitting(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000';
      const res = await fetch(
        `${apiBase}/public/sign/${token}/sign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            otp,
            signature_data: signatureData,
            signature_type: signatureType,
            field_values: [], // Empty for now, will add field filling later
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to submit signature');
      }

      toast.success('Ký tài liệu thành công!');
      
      // Reload to show success state
      setTimeout(() => {
        fetchSigningData();
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Không thể ký tài liệu');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Không tìm thấy tài liệu</p>
        </div>
      </div>
    );
  }

  // Already signed
  if (data.already_signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Đã ký thành công
          </h1>
          <p className="text-gray-600 mb-4">
            Bạn đã ký tài liệu này vào {new Date(data.signed_at!).toLocaleString('vi-VN')}
          </p>
          <Button onClick={() => router.push('/')} variant="outline">
            Đóng
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start gap-4">
            <FileText className="w-12 h-12 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {data.sign_request.title || 'Ký tài liệu'}
              </h1>
              {data.sign_request.message && (
                <p className="text-gray-600 mb-4">{data.sign_request.message}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Người ký:</span>
                  <span className="font-semibold">{data.signer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Email:</span>
                  <span className="font-semibold">{data.signer.email}</span>
                </div>
                {data.sign_request.deadline && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Hạn ký:</span>
                    <span className="font-semibold">
                      {new Date(data.sign_request.deadline).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PDF Viewer with Signature Fields */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <h2 className="text-lg font-semibold p-4 border-b">📄 Tài liệu</h2>
          <div className="h-[700px]">
            <PDFSigningViewer
              pdfUrl={`http://localhost:4000/public/sign/${token}/document`}
              fields={data.fields || []}
              signerId={data.signer.id}
              onFieldClick={(field) => {
                if (!otpSent || otp.length !== 6) {
                  toast.error('Vui lòng xác thực OTP trước khi ký');
                  return;
                }
                setShowSignatureModal(true);
              }}
              signatureData={signatureData}
              currentFieldId={undefined}
            />
          </div>
        </div>

        {/* OTP Verification */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Xác thực OTP</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={otpSent}
                className="mt-1"
              />
            </div>

            {!otpSent ? (
              <Button onClick={handleSendOtp} className="w-full">
                Gửi mã OTP
              </Button>
            ) : (
              <div>
                <Label htmlFor="otp">Mã OTP (6 số)</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kiểm tra email của bạn để lấy mã OTP
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Signature Section */}
        {otpSent && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Chữ ký</h2>
            
            {signatureData ? (
              <div className="space-y-4">
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <img
                    src={signatureData}
                    alt="Signature"
                    className="max-w-full h-auto max-h-32 mx-auto"
                  />
                </div>
                <Button
                  onClick={() => setShowSignatureModal(true)}
                  variant="outline"
                  className="w-full"
                >
                  Thay đổi chữ ký
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleOpenSignatureModal}
                className="w-full"
              >
                ✍️ Ký tài liệu
              </Button>
            )}
          </div>
        )}

        {/* Submit Button */}
        {signatureData && (
          <Button
            onClick={handleSubmitSignature}
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
          >
            {submitting ? 'Đang gửi...' : '📤 Hoàn tất ký'}
          </Button>
        )}
      </div>

      {/* Signature Modal */}
      <SignatureModal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onConfirm={handleSignatureConfirm}
        signerName={data.signer.name}
      />
    </div>
  );
}
