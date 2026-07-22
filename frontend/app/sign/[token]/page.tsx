'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SignatureModal from '@/components/signature/SignatureModal';
import SigningSidebar from '@/components/signing/SigningSidebar';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import ThankYouPage from '@/components/signing/ThankYouPage';
import { toast } from 'sonner';
import { FileText, Mail, User, Clock, Play } from 'lucide-react';
import { getPublicApiBaseUrl } from '@/lib/env';
import { AsyncListSkeleton } from '@/components/ui/async-state';

const PDFSigningViewer = dynamic(() => import('@/components/pdf/PDFSigningViewer'), { ssr: false });

interface SigningData {
  signer: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    signed_at?: string;
  };
  sign_request: {
    id: number;
    title: string;
    message: string;
    deadline: string;
    created_at: string;
  };
  document: {
    id: number;
    title: string;
    original_file_name: string;
    document_number?: string;
    created_at: string;
  };
  fields: any[];
  signers?: Array<{
    id: number;
    name: string;
    email: string;
    status: string;
    signed_at?: string;
    role: string;
  }>;
  activities?: Array<{
    id: number;
    user_name: string;
    action: string;
    timestamp: string;
  }>;
  already_signed?: boolean;
  signed_at?: string;
}

export default function PublicSigningPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SigningData | null>(null);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | 'typed'>('drawn');
  const [submitting, setSubmitting] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(0);
  const [otpFeedback, setOtpFeedback] = useState('');
  
  // Guided flow state
  const [guidedMode, setGuidedMode] = useState(false);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [completedFields, setCompletedFields] = useState<number[]>([]);
  const [fieldSignatures, setFieldSignatures] = useState<Record<number, string>>({});
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const initialUpdate = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  const fetchSigningData = useCallback(async (): Promise<SigningData | null> => {
    setLoadError(null);
    try {
      const apiBase = getPublicApiBaseUrl();
      const res = await fetch(`${apiBase}/public/sign/${token}`, { credentials: 'include' });
      const result = await res.json();

      if (!res.ok) {
        // Backend returns error in format: { success: false, error: { message: "...", code: "..." } }
        const errorMsg = result.error?.message || result.message || 'Failed to load signing data';
        throw new Error(errorMsg);
      }

      const signingData = result.data as SigningData;
      setData(signingData);
      setOtpVerified(Boolean(signingData.document && signingData.sign_request?.id && signingData.signer?.id));

      // The completed state is rendered by the page. A post-sign refresh must
      // not repeat the success toast.
      return signingData;
    } catch (error: any) {
      const message = error.message || 'Không thể tải dữ liệu';
      setLoadError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(fetchSigningData);
  }, [fetchSigningData]);

  const handleSendOtp = async () => {
    if (Date.now() < resendAvailableAt) return;
    try {
      const apiBase = getPublicApiBaseUrl();
      const res = await fetch(
        `${apiBase}/public/sign/${token}/send-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          credentials: 'include',
        }
      );

      const result = await res.json();

      if (!res.ok) {
        const code = result.error?.code;
        const retryAfter = Number(result.error?.details?.retry_after_seconds ?? 0);
        const recoveryMessages: Record<string, string> = {
          OTP_RESEND_COOLDOWN: `Vui lòng chờ ${Math.max(1, retryAfter)} giây trước khi gửi lại mã.`,
          OTP_DELIVERY_UNAVAILABLE: 'Không thể gửi mã lúc này. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
          SIGNING_REQUEST_EXPIRED: 'Yêu cầu ký đã hết hạn hoặc không còn hiệu lực. Vui lòng liên hệ người gửi.',
          INVALID_SIGNING_LINK: 'Liên kết ký không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ người gửi.',
          SIGNER_EMAIL_MISMATCH: 'Email không khớp với người ký. Vui lòng liên hệ người gửi.',
        };
        if (code === 'OTP_RESEND_COOLDOWN' && retryAfter > 0) setResendAvailableAt(Date.now() + retryAfter * 1000);
        if (recoveryMessages[code]) throw new Error(recoveryMessages[code]);
        // Backend returns error in format: { success: false, error: { message: "...", code: "..." } }
        const errorMsg = result.error?.message || result.message || 'Không thể gửi OTP';
        let errorMessage = errorMsg;
        
        if (res.status === 400) {
          if (errorMsg.includes('Email does not match')) {
            errorMessage = '📧 Email không khớp với người ký. Vui lòng kiểm tra lại email.';
          }
        } else if (res.status === 404) {
          errorMessage = '🔗 Liên kết ký không hợp lệ hoặc đã hết hạn.';
        } else if (res.status === 500) {
          errorMessage = '🔧 Lỗi hệ thống. Vui lòng thử lại sau.';
        }
        
        throw new Error(errorMessage);
      }

      setOtpSent(true);
      setOtpExpiresAt(result.data?.otp_expires_at ?? null);
      setResendAvailableAt(Date.now() + Number(result.data?.resend_cooldown_seconds ?? 30) * 1000);
      setOtpFeedback('Mã OTP đã được gửi. Hãy kiểm tra email của bạn.');
      toast.success('📧 Mã OTP đã được gửi đến email của bạn');
    } catch (error: any) {
      setOtpFeedback(error.message || 'Không thể gửi OTP');
      toast.error(error.message || 'Không thể gửi OTP');
    }
  };



  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Vui lòng nhập đầy đủ mã OTP (6 số)');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      toast.error('Mã OTP phải là 6 chữ số');
      return;
    }

    setVerifying(true);
    try {
      const apiBase = getPublicApiBaseUrl();
      const res = await fetch(`${apiBase}/public/sign/${token}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
        credentials: 'include',
      });

      const result = await res.json();

      if (!res.ok) {
        const errorMsg = result.error?.message || result.message || 'Mã OTP không hợp lệ';
        let errorMessage = errorMsg;
        
        if (result.error?.code === 'OTP_EXPIRED') {
          errorMessage = '⏰ Mã OTP đã hết hạn. Vui lòng click "Gửi lại OTP" để nhận mã mới.';
        } else if (result.error?.code === 'OTP_INVALID') {
          errorMessage = '❌ Mã OTP không đúng. Vui lòng kiểm tra lại mã OTP trong email.';
        } else if (result.error?.code === 'OTP_NOT_ISSUED') {
          errorMessage = '📧 Chưa có mã OTP. Vui lòng click "Gửi lại OTP" trước.';
        } else if (result.error?.code === 'OTP_ATTEMPTS_EXCEEDED' || result.error?.code === 'TOO_MANY_REQUESTS') {
          errorMessage = 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi yêu cầu mã mới.';
        }
        
        throw new Error(errorMessage);
      }

      const verifiedData = await fetchSigningData();
      if (!verifiedData?.document || !verifiedData?.sign_request) {
        setData(null);
        setLoadError('Không thể tải tài liệu sau khi xác thực. Vui lòng thử lại.');
        return;
      }
      setOtpVerified(true);
      toast.success('✅ Xác thực thành công! Bạn có thể bắt đầu ký tài liệu.');
    } catch (error: any) {
      setOtpFeedback(error.message || 'Không thể xác thực OTP');
      toast.error(error.message || 'Không thể xác thực OTP');
      setOtpVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenSignatureModal = () => {
    if (!otpVerified) {
      toast.error('🔐 Vui lòng xác thực OTP trước');
      return;
    }
    
    // Don't open modal in guided mode
    if (guidedMode) {
      toast.info('Vui lòng ký theo hướng dẫn trên PDF');
      return;
    }
    
    setShowSignatureModal(true);
  };

  const handleSignatureConfirm = (data: string, type: 'drawn' | 'uploaded' | 'typed') => {
    setSignatureData(data);
    setSignatureType(type);
    setShowSignatureModal(false);
    
    // Apply signature to all signature fields
    const signatureFields = myFields.filter(f => f.type === 'signature');
    const newFieldSignatures: Record<number, string> = {};
    const autoCompletedFieldIds: number[] = [];
    
    signatureFields.forEach(field => {
      newFieldSignatures[field.id] = data;
      autoCompletedFieldIds.push(field.id);
    });
    
    // Auto-fill date fields
    const dateFields = myFields.filter(f => f.type === 'date');
    const today = new Date().toLocaleDateString('vi-VN');
    dateFields.forEach(field => {
      newFieldSignatures[field.id] = today;
      autoCompletedFieldIds.push(field.id);
    });
    
    setFieldSignatures(newFieldSignatures);
    setCompletedFields(Array.from(new Set(autoCompletedFieldIds)));
    
    const remainingInteractiveFields = myFields.filter(
      (field) => !autoCompletedFieldIds.includes(field.id)
    );

    if (remainingInteractiveFields.length > 0) {
      toast.success(
        `Đã áp dụng chữ ký cho ${signatureFields.length} vị trí. Còn ${remainingInteractiveFields.length} ô cần nhập/chọn.`
      );
      return;
    }

    toast.success(`Đã áp dụng chữ ký cho ${signatureFields.length} vị trí. Nhấn "Hoàn tất ký" để gửi.`);
  };

  // Guided flow functions
  const myFields = (data?.fields || [])
    .filter((f) => !f.assigned_signer_id || f.assigned_signer_id === data?.signer.id)
    .sort((a, b) => {
      // Sort by page first, then by y position (top to bottom), then by x (left to right)
      if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
      if (Math.abs(a.yPct - b.yPct) > 0.01) return a.yPct - b.yPct;
      return a.xPct - b.xPct;
    });

  const handleStartGuided = () => {
    if (!otpVerified) {
      toast.error('🔐 Vui lòng xác thực OTP trước');
      return;
    }
    
    // Reset all guided mode state
    setCompletedFields([]);
    setFieldSignatures({});
    setCurrentFieldIndex(0);
    
    setGuidedMode(true);
    scrollToField(0);
  };

  const scrollToField = (index: number) => {
    if (index >= myFields.length) return;
    
    const field = myFields[index];
    const element = document.getElementById(`field-${field.id}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
      
      // Highlight field with pulse animation
      setTimeout(() => {
        element.classList.add('animate-pulse');
        setTimeout(() => element.classList.remove('animate-pulse'), 2000);
      }, 500);
    }
  };

  const handleFieldComplete = (fieldId: number, signature: string) => {
    const newCompletedFields = [...completedFields, fieldId];
    const newFieldSignatures = { ...fieldSignatures, [fieldId]: signature };
    
    setCompletedFields(newCompletedFields);
    setFieldSignatures(newFieldSignatures);
    
    if (currentFieldIndex < myFields.length - 1) {
      // Next field
      const nextIndex = currentFieldIndex + 1;
      
      // Move to next field (including date fields)
      setCurrentFieldIndex(nextIndex);
      setTimeout(() => scrollToField(nextIndex), 500);
    } else {
      // All done
      setGuidedMode(false);
      
      // Show confirmation dialog
      setShowConfirmDialog(true);
    }
  };

  const handleFieldClick = (field: any) => {
    // In guided mode, clicks are handled entirely in PDFSigningViewer
    // This callback should not block anything
    if (guidedMode) {
      // Don't block - let PDFSigningViewer handle it
      return;
    }
    
    // In normal mode, signature is handled in PDFSigningViewer
    // This function is only called for non-signature fields
  };

  const handleConfirmSubmit = () => {
    handleSubmitSignature();
  };

  const handleCancelSubmit = () => {
    toast.success('✅ Đã ký xong tất cả! Bạn có thể xem lại và nhấn "Hoàn tất ký" phía dưới khi sẵn sàng.', {
      duration: 5000
    });
  };

  // Calculate progress
  const totalFields = myFields.length;
  const completedCount = completedFields.length;
  const progress = totalFields > 0 ? (completedCount / totalFields) * 100 : 0;

  const handleSubmitSignature = async () => {
    // In guided mode, check fieldSignatures instead
    const hasSignatures = Object.keys(fieldSignatures).length > 0;
    
    if (!signatureData && !hasSignatures) {
      toast.error('Vui lòng ký tài liệu trước');
      return;
    }

    setSubmitting(true);

    try {
      if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
        throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is required');
      }
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '');
      
      // Prepare field values for guided mode
      const field_values = Object.entries(fieldSignatures).map(([fieldId, value]) => ({
        field_id: parseInt(fieldId),
        value: value,
      }));
      
      // Get first signature for signature_data (backward compatibility)
      const firstSignature = Object.values(fieldSignatures).find(v => 
        typeof v === 'string' && v.startsWith('data:image')
      ) || signatureData || '';
      
      const requestBody = {
        otp,
        signature_data: firstSignature,
        signature_type: signatureType || 'drawn',
        field_values: field_values,
      };
      
      const res = await fetch(
        `${apiBase}/public/sign/${token}/sign`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        // Handle specific error cases
        // Backend returns error in format: { success: false, error: { message: "...", code: "..." } }
        const errorMsg = result.error?.message || result.message || 'Không thể ký tài liệu';
        let errorMessage = errorMsg;
        
        if (res.status === 400) {
          if (errorMsg.includes('Invalid OTP')) {
            errorMessage = '❌ Mã OTP không đúng. Vui lòng kiểm tra lại mã OTP trong email.';
          } else if (errorMsg.includes('OTP expired')) {
            errorMessage = '⏰ Mã OTP đã hết hạn. Vui lòng click "Gửi mã OTP" để nhận mã mới.';
          } else if (errorMsg.includes('OTP not issued')) {
            errorMessage = '📧 Chưa có mã OTP. Vui lòng click "Gửi mã OTP" trước.';
          } else if (errorMsg.includes('required fields')) {
            errorMessage = '📝 Vui lòng điền đầy đủ tất cả các trường bắt buộc.';
          } else if (errorMsg.includes('already signed') || errorMsg.includes('You have already signed')) {
            errorMessage = '✅ Bạn đã ký tài liệu này rồi. Trang sẽ tự động tải lại để hiển thị kết quả.';
            // Auto reload to show thank you page
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } else if (res.status === 404) {
          errorMessage = '🔗 Liên kết ký không hợp lệ hoặc đã hết hạn.';
        } else if (res.status === 500) {
          errorMessage = '🔧 Lỗi hệ thống. Vui lòng thử lại sau.';
        }
        
        throw new Error(errorMessage);
      }

      toast.success('🎉 Ký tài liệu thành công!');
      
      // Show success message and reload to show thank you screen
      setTimeout(() => {
        fetchSigningData();
      }, 1500);
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
          <AsyncListSkeleton rows={2} label="Đang tải yêu cầu ký..." />
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">{loadError || 'Không tìm thấy tài liệu'}</p>
          <Button className="mt-4" onClick={() => { setLoading(true); void fetchSigningData(); }}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  // Already signed - Thank you screen
  if (data.already_signed) {
    return (
      <ThankYouPage
        signerName={data.signer?.name}
        signerEmail={data.signer?.email}
        signerRole={data.signer?.role}
        documentTitle={data.document?.title}
        documentNumber={data.document?.document_number} // ✅ Add document number
        originalFileName={data.document?.original_file_name}
        signedAt={data.signed_at || data.signer?.signed_at}
        signRequestTitle={data.sign_request?.title}
        onDownload={async () => {
          try {
            toast.info('Đang tạo file PDF có chữ ký...');
            if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
              throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is required');
            }
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api/v1', '');
            const res = await fetch(`${apiBase}/public/sign/${token}/download-signed`);
            if (!res.ok) {
              const result = await res.json();
              // Backend returns error in format: { success: false, error: { message: "...", code: "..." } }
              const errorMsg = result.error?.message || result.message || 'Không thể tải xuống PDF';
              throw new Error(errorMsg);
            }
            const contentDisposition = res.headers.get('Content-Disposition');
            let filename = 'document_signed.pdf';
            if (contentDisposition) {
              const matches = /filename="([^"]+)"/.exec(contentDisposition);
              if (matches && matches[1]) filename = matches[1];
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('✅ Tải xuống thành công!');
          } catch (error: any) {
            toast.error(error.message || 'Không thể tải xuống PDF');
          }
        }}
      />
    );
  }

  if (!otpVerified) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="WP Sign" width={56} height={56} priority className="h-14 w-14 rounded-2xl object-contain shadow-sm" />
              <div>
                <div className="text-2xl font-bold tracking-tight text-slate-900">WP Sign</div>
                <div className="text-sm font-medium text-slate-500">Nền tảng ký duyệt điện tử</div>
              </div>
            </div>
            <div className="hidden rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 sm:block">Chờ xác thực</div>
          </div>
        </header>

        <main className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <FileText className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{data.sign_request.title || 'Ký tài liệu'}</h1>
              <p className="mt-2 text-base text-slate-500">Xác thực danh tính để xem và ký tài liệu.</p>
            </div>

            <section className="rounded-3xl border bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-10">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Nhập mã xác thực</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Mã OTP gồm 6 số đã được gửi trong email yêu cầu ký.</p>
              </div>

              <div className="mx-auto max-w-md space-y-5">
                <div>
                  <Label htmlFor="otp" className="text-sm font-medium text-slate-700">Mã OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    value={otp}
                    onPaste={(event) => {
                      event.preventDefault();
                      setOtp(event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6));
                    }}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                    className="mt-2 h-16 text-center font-mono text-3xl font-semibold tracking-[0.45em]"
                  />
                </div>

                <Button onClick={handleVerifyOtp} disabled={otp.length !== 6 || verifying} className="h-14 w-full text-base font-semibold">
                  {verifying ? 'Đang xác thực...' : 'Xác thực và tiếp tục'}
                </Button>

                <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                  <span aria-live="polite">
                    {otpExpiresAt ? `Còn hiệu lực ${Math.max(0, Math.ceil((new Date(otpExpiresAt).getTime() - now) / 1000))} giây` : 'Mã chỉ dùng một lần'}
                  </span>
                  <button type="button" onClick={handleSendOtp} disabled={now < resendAvailableAt} className="font-medium text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline">
                    {now < resendAvailableAt ? `Gửi lại sau ${Math.ceil((resendAvailableAt - now) / 1000)}s` : 'Gửi lại mã'}
                  </button>
                </div>
                <p className="sr-only" aria-live="polite">{otpFeedback}</p>
              </div>
            </section>

            <p className="mt-5 text-center text-sm text-slate-400">Được bảo vệ bởi WP Sign</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 xl:flex">
      {/* Main Content */}
      <div className="min-w-0 flex-1 overflow-y-auto py-3 sm:py-4">
        <div className="mx-auto max-w-[1600px] px-3 sm:px-4 lg:px-6">

        {/* Header */}
        <div className="sticky top-0 z-20 mb-4 rounded-lg border bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Image src="/logo.png" alt="WP Sign" width={42} height={42} priority className="h-10 w-10 shrink-0 rounded-xl object-contain" />
              <div className="hidden shrink-0 sm:block">
                <p className="font-bold leading-5 text-slate-950">WP Sign</p>
                <p className="text-xs text-slate-500">Nền tảng ký duyệt</p>
              </div>
              <div className="hidden h-9 w-px shrink-0 bg-slate-200 sm:block" />
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
                  {data.sign_request.title || 'Ký tài liệu'}
                </h1>
                {data.sign_request.message && (
                  <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">{data.sign_request.message}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600 sm:text-sm">
              <span className="flex items-center gap-1.5"><User className="h-4 w-4 text-gray-400" />{data.signer.name}</span>
              {data.signer.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-gray-400" />{data.signer.email}</span>}
              {data.sign_request.deadline && (
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-gray-400" />Hạn {new Date(data.sign_request.deadline).toLocaleDateString('vi-VN')}</span>
              )}
              <span className={`rounded-full px-2.5 py-1 font-medium ${otpVerified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {otpVerified ? 'Đã xác thực' : 'Chờ xác thực'}
              </span>
            </div>
          </div>
        </div>

        {/* Signing Options - Guided or Modal */}
        {!guidedMode && otpVerified && myFields.length > 0 && Object.keys(fieldSignatures).length === 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Chọn cách ký</p>
              <p className="mt-0.5 text-xs text-gray-500">Có {myFields.length} vị trí cần hoàn thành trên tài liệu.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleStartGuided}>
                <Play className="mr-2 h-4 w-4" />
                Hướng dẫn từng bước
              </Button>
              <Button type="button" onClick={handleOpenSignatureModal}>
                <FileText className="mr-2 h-4 w-4" />
                Tạo chữ ký
              </Button>
            </div>
          </div>
        )}

        {/* Resume guided signing */}
        {!guidedMode && otpVerified && myFields.length > 0 && Object.keys(fieldSignatures).length > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Tiến độ ký: {completedFields.length}/{myFields.length}</p>
              <p className="mt-0.5 text-xs text-blue-700">Tiếp tục đến vị trí chưa hoàn thành.</p>
            </div>
            <Button type="button" variant="outline" onClick={handleStartGuided} className="border-blue-300 bg-white text-blue-700 hover:bg-blue-100">
              <Play className="mr-2 h-4 w-4" />
              Tiếp tục hướng dẫn
            </Button>
          </div>
        )}

        {/* PDF Viewer with Signature Fields */}
        {otpVerified && (
        <div className="mb-4 overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-gray-500" />Xem tài liệu</h2>
            {guidedMode && <span className="text-xs font-medium text-blue-700">Vị trí {Math.min(currentFieldIndex + 1, myFields.length)}/{myFields.length}</span>}
          </div>
          <div className="h-[calc(100vh-190px)] min-h-[640px]">
            <PDFSigningViewer
              pdfUrl={otpVerified
                ? `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || ''}/public/sign/${token}/document`
                : ''}
              withCredentials
              fitMode="page"
              fields={data.fields || []}
              signerId={data.signer.id}
              onFieldClick={handleFieldClick}
              signatureData={signatureData}
              currentFieldId={guidedMode ? myFields[currentFieldIndex]?.id : undefined}
              completedFieldIds={completedFields}
              guidedMode={guidedMode}
              onFieldComplete={handleFieldComplete}
              existingFieldValues={fieldSignatures}
            />
          </div>
        </div>
        )}

        {/* Signature Section - Hidden in guided mode or when using field signatures */}
        {otpVerified && !guidedMode && Object.keys(fieldSignatures).length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Chữ ký</h2>
            
            {signatureData ? (
              <div className="space-y-4">
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <Image
                    src={signatureData}
                    alt="Signature"
                    width={500}
                    height={128}
                    unoptimized
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

        {/* Submit Button - Show if has signature OR field signatures */}
        {(signatureData || Object.keys(fieldSignatures).length > 0) && !guidedMode && (
          <div className="space-y-4">
            {/* Summary of completed fields */}
            {Object.keys(fieldSignatures).length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  ✅ Đã hoàn thành {Object.keys(fieldSignatures).length} vị trí ký
                </h3>
                <div className="text-xs text-blue-700 space-y-1">
                  {Object.entries(fieldSignatures).map(([fieldId, value]) => {
                    const field = myFields.find(f => f.id === parseInt(fieldId));
                    return (
                      <div key={fieldId} className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{field?.label || `Field #${fieldId}`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <Button
              onClick={handleSubmitSignature}
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
            >
              {submitting ? 'Đang gửi...' : '📤 Hoàn tất ký'}
            </Button>
          </div>
        )}

        {/* Signature Modal */}
        <SignatureModal
          open={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onConfirm={handleSignatureConfirm}
          signerName={data.signer.name}
        />
        </div>
      </div>
      
      {/* Sidebar - Right side, only show after OTP verified */}
      {otpVerified && (
        <SigningSidebar
          document={{
            title: data.document.title,
            original_file_name: data.document.original_file_name,
            created_at: data.document.created_at || new Date().toISOString(),
          }}
          signRequest={{
            title: data.sign_request.title,
            deadline: data.sign_request.deadline,
            created_at: data.sign_request.created_at || new Date().toISOString(),
          }}
          signers={data.signers || [data.signer]}
          currentSigner={data.signer}
          activities={data.activities || []}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmSubmit}
        title="Hoàn thành ký tài liệu"
        message={`🎉 Chúc mừng! Bạn đã ký xong tất cả các trường!

✅ Chữ ký: Đã hoàn thành
✅ Ngày ký: Đã hoàn thành

📤 Bấm "Gửi ngay" để gửi tài liệu ngay bây giờ
📋 Bấm "Xem lại" để kiểm tra trước khi gửi`}
        confirmText="📤 Gửi ngay"
        cancelText="📋 Xem lại"
      />
    </div>
  );
}
