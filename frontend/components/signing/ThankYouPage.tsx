'use client';

import { CheckCircle, Download, FileText, Calendar, User, Mail, Clock, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThankYouPageProps {
  signerName?: string;
  signerEmail?: string;
  signerRole?: string;
  documentTitle?: string;
  documentNumber?: string; // ✅ Add document number
  originalFileName?: string;
  signedAt?: string;
  signRequestTitle?: string;
  onDownload?: () => void;
}

export default function ThankYouPage({
  signerName,
  signerEmail,
  signerRole,
  documentTitle,
  documentNumber, // ✅ Add document number
  originalFileName,
  signedAt,
  signRequestTitle,
  onDownload
}: ThankYouPageProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleString('vi-VN');
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const formatRole = (role?: string) => {
    switch (role) {
      case 'signer': return 'Người ký';
      case 'approver': return 'Người phê duyệt';
      case 'reviewer': return 'Người xem xét';
      default: return role || 'Người ký';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-t-8 border-green-500">
          {/* Header with Animation */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
            </div>
            
            <div className="relative z-10">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-bounce">
                <CheckCircle className="w-20 h-20 text-green-600" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                🎉 Cảm ơn bạn!
              </h1>
              
              <p className="text-xl text-white opacity-90">
                Tài liệu đã được ký thành công
              </p>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Signing Time */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  Thời gian ký: {formatDate(signedAt)}
                </span>
              </div>
            </div>
            
            {/* Document Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left Column - Document Info */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Thông tin tài liệu
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 block mb-1">Tiêu đề yêu cầu ký</span>
                    <span className="font-semibold text-gray-900 block">
                      {signRequestTitle || documentTitle || 'Tài liệu ký số'}
                    </span>
                  </div>
                  {documentNumber && (
                    <div>
                      <span className="text-gray-600 block mb-1">🔢 Mã văn bản</span>
                      <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded block">
                        {documentNumber}
                      </span>
                    </div>
                  )}
                  {originalFileName && (
                    <div>
                      <span className="text-gray-600 block mb-1">File gốc</span>
                      <span className="font-mono text-xs font-medium text-gray-900 bg-white px-2 py-1 rounded block break-all">
                        {originalFileName}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600 block mb-1">Trạng thái</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Đã ký hoàn tất
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Signer Info */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Thông tin người ký
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 block mb-1">Họ và tên</span>
                    <span className="font-semibold text-gray-900 block">{signerName || 'Khách hàng'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Email</span>
                    <span className="font-medium text-gray-900 block break-all">{signerEmail || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Vai trò</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {formatRole(signerRole)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Thời gian ký</span>
                    <span className="font-medium text-gray-900 block">{formatDate(signedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Success Message */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">
                    ✅ Tài liệu đã được ký thành công!
                  </h3>
                  <p className="text-green-800 text-sm leading-relaxed">
                    Chữ ký điện tử của bạn đã được lưu trữ an toàn và có giá trị pháp lý 
                    tương đương với tài liệu ký tay theo quy định của pháp luật Việt Nam.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Next Steps */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                📧 Tiếp theo
              </h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Bạn sẽ nhận được email xác nhận trong vài phút tới</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Tài liệu đã ký sẽ được gửi kèm theo email</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Bạn có thể lưu lại hoặc in trang này làm bằng chứng</span>
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {onDownload && (
                <Button
                  onClick={onDownload}
                  variant="outline"
                  className="py-6 text-lg border-2 hover:bg-blue-50 hover:border-blue-300"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Tải xuống
                </Button>
              )}
              
              <Button 
                onClick={() => window.print()} 
                variant="outline"
                className="py-6 text-lg border-2 hover:bg-gray-50"
              >
                <Printer className="w-5 h-5 mr-2" />
                In trang này
              </Button>
              
              <Button 
                onClick={() => window.close()} 
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              >
                ✓ Đóng cửa sổ
              </Button>
            </div>
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">
                🔒 Cảm ơn bạn đã sử dụng dịch vụ ký số điện tử của chúng tôi
              </p>
              <p className="text-xs text-gray-500">
                Hệ thống ký số an toàn, bảo mật và tuân thủ pháp luật Việt Nam
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}