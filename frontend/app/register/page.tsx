'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { policyMetadata } from '@/lib/policy-metadata';

const REGISTER_DRAFT_KEY = 'eoffice.register-draft';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(() => {
    if (typeof window === 'undefined') return { email: '', password: '', confirmPassword: '', full_name: '', company_name: '', create_tenant: false, terms_accepted: false };
    try {
      return { email: '', password: '', confirmPassword: '', full_name: '', company_name: '', create_tenant: false, terms_accepted: false, ...JSON.parse(window.sessionStorage.getItem(REGISTER_DRAFT_KEY) || '{}') };
    } catch {
      return { email: '', password: '', confirmPassword: '', full_name: '', company_name: '', create_tenant: false, terms_accepted: false };
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
  };

  useEffect(() => {
    window.sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(formData));
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!passwordStrength.length || !passwordStrength.uppercase || !passwordStrength.lowercase || !passwordStrength.number) {
      setError('Mật khẩu chưa đủ mạnh');
      return;
    }

    if (!formData.terms_accepted) {
      setError('Bạn phải đồng ý với điều khoản sử dụng');
      return;
    }

    if (formData.create_tenant && !formData.company_name.trim()) {
      setError('Vui lòng nhập tên công ty khi tạo tenant mới');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          company_name: formData.company_name,
          create_tenant: formData.create_tenant,
          terms_accepted: formData.terms_accepted
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      setSuccess(true);
      window.sessionStorage.removeItem(REGISTER_DRAFT_KEY);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng ký thành công!</h1>
            <p className="text-gray-600 mb-6">
              {formData.create_tenant 
                ? 'Workspace mới và tài khoản của bạn đã được tạo, đang chờ phê duyệt từ quản trị viên.'
                : 'Tài khoản của bạn đã được tạo và đang chờ phê duyệt từ quản trị viên.'
              }
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-800 font-medium mb-2">
                📧 Chúng tôi đã gửi email xác nhận đến: <strong>{formData.email}</strong>
              </p>
              {formData.create_tenant && formData.company_name && (
                <p className="text-sm text-blue-800 font-medium mb-2">
                  🏢 Workspace: <strong>{formData.company_name}</strong>
                </p>
              )}
              <p className="text-sm text-blue-700">
                Bạn sẽ nhận được email thông báo khi tài khoản được kích hoạt (thường trong vòng 24 giờ).
              </p>
            </div>
            <Link href="/login">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại đăng nhập
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/login" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại đăng nhập
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tạo tài khoản mới</h1>
            <p className="text-gray-600">
              Đăng ký để sử dụng FlowDocker E-Office
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@company.com"
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start mb-3">
                <input
                  id="create_tenant"
                  type="checkbox"
                  checked={formData.create_tenant}
                  onChange={(e) => setFormData({ ...formData, create_tenant: e.target.checked })}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="create_tenant" className="ml-2 text-sm font-medium text-gray-700">
                  Tạo workspace mới cho công ty của tôi
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Chọn tùy chọn này nếu bạn muốn tạo workspace riêng cho công ty. Nếu không, bạn sẽ tham gia workspace mặc định.
              </p>
              
              {formData.create_tenant && (
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Tên công ty <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="company_name"
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Công ty TNHH ABC"
                    required={formData.create_tenant}
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nhập mật khẩu"
                  className="pl-10 pr-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password strength indicators */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className={`flex items-center text-xs ${passwordStrength.length ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordStrength.length ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    Ít nhất 8 ký tự
                  </div>
                  <div className={`flex items-center text-xs ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordStrength.uppercase ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    Ít nhất 1 chữ hoa
                  </div>
                  <div className={`flex items-center text-xs ${passwordStrength.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordStrength.lowercase ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    Ít nhất 1 chữ thường
                  </div>
                  <div className={`flex items-center text-xs ${passwordStrength.number ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordStrength.number ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    Ít nhất 1 số
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Nhập lại mật khẩu"
                  className="pl-10 pr-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                checked={formData.terms_accepted}
                onChange={(e) => setFormData({ ...formData, terms_accepted: e.target.checked })}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                required
                disabled={loading}
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                I have read and agree to the current draft{' '}
                <Link href="/terms" className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2">
                  Privacy Notice
                </Link>{' '}
                for this FlowDocker E-Office alpha deployment. This acceptance does not grant commercial resale, hosted resale, white-label, OEM, or trademark rights.
                <span className="block mt-1 text-xs text-gray-500">Versions {policyMetadata.termsVersion}/{policyMetadata.privacyVersion}, draft effective date {policyMetadata.effectiveDate}.</span>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <h2 className="text-4xl font-bold mb-6">Chào mừng đến với FlowDocker E-Office!</h2>
          <p className="text-lg text-blue-100 mb-8">
            Hệ thống quản lý tài liệu và luồng ký điện tử hiện đại, giúp doanh nghiệp của bạn vận hành hiệu quả hơn.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Quản lý tài liệu tập trung</h3>
                <p className="text-sm text-blue-100">Lưu trữ và quản lý tất cả tài liệu ở một nơi</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Luồng phê duyệt tự động</h3>
                <p className="text-sm text-blue-100">Tự động hóa quy trình phê duyệt tài liệu</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Ký điện tử an toàn</h3>
                <p className="text-sm text-blue-100">Ký tài liệu điện tử với bảo mật cao</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
