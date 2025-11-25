'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SignatureModal from '@/components/signature/SignatureModal';
import PDFSigningViewer from '@/components/pdf/PDFSigningViewer';
import ProgressHeader from '@/components/signing/ProgressHeader';
import SigningSidebar from '@/components/signing/SigningSidebar';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import ThankYouPage from '@/components/signing/ThankYouPage';
import { toast } from 'sonner';
import { CheckCircle, FileText, Mail, User, Clock, Play } from 'lucide-react';

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
    created_at: string;
  };
  document: {
    id: number;
    title: string;
    original_file_name: string;
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
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | 'typed'>('drawn');
  const [submitting, setSubmitting] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Guided flow state
  const [guidedMode, setGuidedMode] = useState(false);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [completedFields, setCompletedFields] = useState<number[]>([]);
  const [fieldSignatures, setFieldSignatures] = useState<Record<number, string>>({});
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
        let errorMessage = result.message || 'Không thể gửi OTP';
        
        if (res.status === 400) {
          if (result.message?.includes('Email does not match')) {
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
      setOtpVerified(false); // Reset verified state
      toast.success('📧 Mã OTP đã được gửi đến email của bạn');
      
      // Show debug OTP if available (dev mode)
      if (result.data?.debug_otp) {
        console.log('🔑 DEBUG OTP:', result.data.debug_otp);
        toast.info(`🔑 DEBUG OTP: ${result.data.debug_otp}`, { duration: 10000 });
      }
    } catch (error: any) {
      console.error('❌ Send OTP error:', error);
      toast.error(error.message || 'Không thể gửi OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Vui lòng nhập đầy đủ mã OTP (6 số)');
      return;
    }

    setVerifying(true);
    try {
      // Just validate format - actual verification happens on submit
      if (!/^\d{6}$/.test(otp)) {
        throw new Error('Mã OTP phải là 6 chữ số');
      }

      setOtpVerified(true);
      toast.success('✅ Mã OTP hợp lệ! Bạn có thể bắt đầu ký tài liệu.');
    } catch (error: any) {
      toast.error(error.message || 'Mã OTP không hợp lệ');
      setOtpVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenSignatureModal = () => {
    if (!otpSent) {
      toast.error('📧 Vui lòng gửi mã OTP trước');
      return;
    }
    
    if (!otp || otp.length !== 6) {
      toast.error('🔢 Vui lòng nhập đầy đủ mã OTP (6 số)');
      return;
    }
    
    if (!/^\d{6}$/.test(otp)) {
      toast.error('🔢 Mã OTP phải là 6 chữ số');
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
    
    signatureFields.forEach(field => {
      newFieldSignatures[field.id] = data;
    });
    
    // Auto-fill date fields
    const dateFields = myFields.filter(f => f.type === 'date');
    const today = new Date().toLocaleDateString('vi-VN');
    dateFields.forEach(field => {
      newFieldSignatures[field.id] = today;
    });
    
    setFieldSignatures(newFieldSignatures);
    setCompletedFields(myFields.map(f => f.id));
    
    toast.success(`Đã áp dụng chữ ký cho ${signatureFields.length} vị trí. Nhấn "Hoàn tất ký" để gửi.`);
  };

  // Guided flow functions
  const myFields = (data?.fields || [])
    .filter((f) => !f.assigned_signer_id || f.assigned_signer_id === data?.signer.id)
    .sort((a, b) => {
      // Sort by page first, then by y position (top to bottom), then by x (left to right)
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(a.y - b.y) > 5) return a.y - b.y; // 5% tolerance for same row
      return a.x - b.x;
    });

  const handleStartGuided = () => {
    console.log('🚀 handleStartGuided called');
    console.log('📧 otpSent:', otpSent);
    console.log('🔢 otp:', otp);
    console.log('📋 myFields:', myFields.map(f => ({ id: f.id, label: f.label, page: f.page, x: f.x, y: f.y })));
    
    if (!otpSent) {
      toast.error('📧 Vui lòng gửi mã OTP trước');
      return;
    }
    
    if (!otp || otp.length !== 6) {
      toast.error('🔢 Vui lòng nhập đầy đủ mã OTP (6 số)');
      return;
    }
    
    if (!/^\d{6}$/.test(otp)) {
      toast.error('🔢 Mã OTP phải là 6 chữ số');
      return;
    }
    
    console.log('🔄 Resetting guided mode state...');
    // Reset all guided mode state
    setCompletedFields([]);
    setFieldSignatures({});
    setCurrentFieldIndex(0);
    
    console.log('✅ Setting guidedMode to TRUE');
    console.log('🎯 First field ID:', myFields[0]?.id);
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
    console.log('🎯 Field completed:', fieldId);
    console.log('📊 Current index:', currentFieldIndex);
    console.log('📋 Total fields:', myFields.length);
    console.log('📋 Current completedFields:', completedFields);
    
    const newCompletedFields = [...completedFields, fieldId];
    const newFieldSignatures = { ...fieldSignatures, [fieldId]: signature };
    
    setCompletedFields(newCompletedFields);
    setFieldSignatures(newFieldSignatures);
    
    console.log('📋 New completedFields:', newCompletedFields);
    console.log('🔍 Check: currentFieldIndex < myFields.length - 1:', currentFieldIndex, '<', myFields.length - 1, '=', currentFieldIndex < myFields.length - 1);
    
    if (currentFieldIndex < myFields.length - 1) {
      // Next field
      const nextIndex = currentFieldIndex + 1;
      const nextField = myFields[nextIndex];
      console.log('➡️ Moving to next field, index:', nextIndex);
      console.log('🎯 Next field:', { id: nextField?.id, label: nextField?.label, type: nextField?.type, page: nextField?.page });
      console.log('📊 Progress:', `${nextIndex + 1} / ${myFields.length}`);
      
      // Move to next field (including date fields)
      setCurrentFieldIndex(nextIndex);
      setTimeout(() => scrollToField(nextIndex), 500);
    } else {
      // All done
      console.log('✅ All fields completed!');
      console.log('🔄 Setting guidedMode to FALSE');
      setGuidedMode(false);
      
      // Show confirmation dialog
      console.log('💬 Showing confirmation dialog...');
      setShowConfirmDialog(true);
    }
  };

  const handleFieldClick = (field: any) => {
    console.log('📍 Parent handleFieldClick:', field.id, 'guidedMode:', guidedMode);
    
    // In guided mode, clicks are handled entirely in PDFSigningViewer
    // This callback should not block anything
    if (guidedMode) {
      // Don't block - let PDFSigningViewer handle it
      return;
    }
    
    // In normal mode, signature is handled in PDFSigningViewer
    // This function is only called for non-signature fields
    if (field.type !== 'signature') {
      // Handle text/date/checkbox fields here
      console.log('Non-signature field clicked:', field);
    }
  };

  const handleConfirmSubmit = () => {
    console.log('📤 User confirmed submit from guided mode...');
    console.log('🔍 Current fieldSignatures:', fieldSignatures);
    console.log('🔍 Current signatureData:', signatureData);
    console.log('🔍 Current otp:', otp);
    handleSubmitSignature();
  };

  const handleCancelSubmit = () => {
    console.log('📋 User chose to review first');
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
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000';
      
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
      
      console.log('📤 Submitting signature:', {
        otp: otp.substring(0, 2) + '****',
        signature_data_length: firstSignature?.length || 0,
        signature_type: requestBody.signature_type,
        field_values_count: field_values.length,
        field_values: field_values,
      });
      
      const res = await fetch(
        `${apiBase}/public/sign/${token}/sign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        console.error('❌ Submit failed:', {
          status: res.status,
          statusText: res.statusText,
          result: result,
        });
        
        // Handle specific error cases
        let errorMessage = result.message || 'Không thể ký tài liệu';
        
        if (res.status === 400) {
          if (result.message?.includes('Invalid OTP')) {
            errorMessage = '❌ Mã OTP không đúng. Vui lòng kiểm tra lại mã OTP trong email.';
          } else if (result.message?.includes('OTP expired')) {
            errorMessage = '⏰ Mã OTP đã hết hạn. Vui lòng click "Gửi mã OTP" để nhận mã mới.';
          } else if (result.message?.includes('OTP not issued')) {
            errorMessage = '📧 Chưa có mã OTP. Vui lòng click "Gửi mã OTP" trước.';
          } else if (result.message?.includes('required fields')) {
            errorMessage = '📝 Vui lòng điền đầy đủ tất cả các trường bắt buộc.';
          } else if (result.message?.includes('already signed') || result.message?.includes('You have already signed')) {
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

      console.log('✅ Submit successful:', result);
      toast.success('🎉 Ký tài liệu thành công!');
      
      // Show success message and reload to show thank you screen
      setTimeout(() => {
        fetchSigningData();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Submit error:', error);
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

  // Already signed - Thank you screen
  if (data.already_signed) {
    return (
      <ThankYouPage
        signerName={data.signer?.name}
        signerEmail={data.signer?.email}
        signerRole={data.signer?.role}
        documentTitle={data.document?.title}
        originalFileName={data.document?.original_file_name}
        signedAt={data.signed_at || data.signer?.signed_at}
        signRequestTitle={data.sign_request?.title}
        onDownload={async () => {
          try {
            toast.info('Đang tạo file PDF có chữ ký...');
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000';
            const res = await fetch(`${apiBase}/public/sign/${token}/download-signed`);
            if (!res.ok) {
              const result = await res.json();
              throw new Error(result.message || 'Không thể tải xuống PDF');
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
            console.error('Download error:', error);
            toast.error(error.message || 'Không thể tải xuống PDF');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto py-8">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
        {/* Progress Header (Guided Mode) */}
        {guidedMode && (
          <ProgressHeader
            currentIndex={currentFieldIndex}
            totalFields={myFields.length}
            fields={myFields}
            completedFields={completedFields}
          />
        )}

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
                disabled={true}
                className="mt-1 bg-gray-50"
                title="Email được lấy từ thông tin người ký"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email của người ký (không thể thay đổi)
              </p>
            </div>

            {/* Always show OTP input */}
            <div>
              <Label htmlFor="otp">Mã OTP (6 số)</Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setOtpVerified(false); // Reset verified when OTP changes
                }}
                placeholder="000000"
                maxLength={6}
                className="mt-1"
                disabled={otpVerified}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Mã OTP đã được gửi trong email yêu cầu ký. Nếu không tìm thấy hoặc hết hạn, nhấn "Gửi lại OTP" bên dưới.
              </p>
            </div>

            {/* Verify and Resend buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleVerifyOtp}
                disabled={!otp || otp.length !== 6 || otpVerified || verifying}
                className="w-full"
              >
                {verifying ? '⏳ Đang xác thực...' : otpVerified ? '✅ Đã xác thực' : '🔐 Xác thực OTP'}
              </Button>
              <Button 
                onClick={handleSendOtp} 
                variant="outline"
                className="w-full"
              >
                {otpSent ? '🔄 Gửi lại OTP' : '📧 Gửi lại OTP'}
              </Button>
            </div>
          </div>
        </div>

        {/* Signing Options - Guided or Modal */}
        {!guidedMode && otpVerified && myFields.length > 0 && Object.keys(fieldSignatures).length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Option 1: Guided Mode */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl p-6 cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                 onClick={handleStartGuided}>
              <div className="relative z-10 text-white">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Hướng dẫn từng bước</h3>
                <p className="text-blue-50 text-sm mb-4">
                  Hệ thống dẫn bạn qua từng vị trí cần ký
                </p>
                <div className="flex items-center gap-2 text-white text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Dễ dàng & nhanh chóng</span>
                </div>
              </div>
            </div>

            {/* Option 2: Modal Mode */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-500 via-teal-500 to-cyan-500 rounded-2xl shadow-2xl p-6 cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                 onClick={handleOpenSignatureModal}>
              <div className="relative z-10 text-white">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Ký một lần</h3>
                <p className="text-green-50 text-sm mb-4">
                  Tạo chữ ký và áp dụng cho tất cả vị trí
                </p>
                <div className="flex items-center gap-2 text-white text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Nhanh gọn & tiện lợi</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start Guided Button - Beautiful Design (Fallback) */}
        {!guidedMode && otpVerified && myFields.length > 0 && Object.keys(fieldSignatures).length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl p-8 mb-6">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-white opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left Side - Info */}
                <div className="flex-1 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">
                      Chế độ hướng dẫn ký
                    </h3>
                  </div>
                  <p className="text-blue-50 text-lg mb-2">
                    Hệ thống sẽ dẫn bạn qua từng vị trí cần ký
                  </p>
                  <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm font-bold backdrop-blur-sm">
                      {myFields.length}
                    </div>
                    <span className="text-blue-50">vị trí cần ký</span>
                  </div>
                </div>
                
                {/* Right Side - Button */}
                <div className="flex-shrink-0">
                  <Button
                    onClick={handleStartGuided}
                    className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 px-8 py-6 text-lg font-bold"
                    size="lg"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    Bắt đầu ngay
                  </Button>
                </div>
              </div>
              
              {/* Features */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-white text-sm">
                  <CheckCircle className="w-5 h-5" />
                  <span>Hướng dẫn từng bước</span>
                </div>
                <div className="flex items-center gap-2 text-white text-sm">
                  <CheckCircle className="w-5 h-5" />
                  <span>Tự động cuộn trang</span>
                </div>
                <div className="flex items-center gap-2 text-white text-sm">
                  <CheckCircle className="w-5 h-5" />
                  <span>Dễ dàng & nhanh chóng</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer with Signature Fields */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <h2 className="text-lg font-semibold p-4 border-b">📄 Tài liệu</h2>
          <div className="h-[700px]">
            <PDFSigningViewer
              pdfUrl={`http://localhost:4000/public/sign/${token}/document`}
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

        {/* Signature Section - Hidden in guided mode or when using field signatures */}
        {otpSent && !guidedMode && Object.keys(fieldSignatures).length === 0 && (
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
