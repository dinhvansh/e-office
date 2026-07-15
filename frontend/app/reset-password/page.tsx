'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(token));
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  useEffect(() => {
    if (!token) return;

    // Verify token
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/verify-reset-token/${token}`)
      .then(res => res.json())
      .then(data => {
        setTokenValid(data.valid);
        if (!data.valid) {
          setError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
        }
      })
      .catch(() => {
        setError('Không thể xác thực token');
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!passwordStrength.length || !passwordStrength.uppercase || !passwordStrength.lowercase || !passwordStrength.number) {
      setError('Mật khẩu chưa đủ mạnh');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link không hợp lệ</h1>
            <p className="text-gray-600 mb-6">{error || 'Token không hợp lệ'}</p>
            <Link href="/forgot-password">
              <Button className="w-full">Yêu cầu link mới</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Đặt lại mật khẩu thành công!</h1>
            <p className="text-gray-600 mb-6">
              Mật khẩu của bạn đã được cập nhật. Đang chuyển đến trang đăng nhập...
            </p>
            <Link href="/login">
              <Button className="w-full">Đăng nhập ngay</Button>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Đặt mật khẩu mới</h1>
            <p className="text-gray-600">
              Tạo mật khẩu mới cho tài khoản của bạn
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
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
              {password && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700">Yêu cầu mật khẩu:</p>
                  <div className="space-y-1">
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </Button>
          </form>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <h2 className="text-4xl font-bold mb-6">Bảo mật là ưu tiên hàng đầu</h2>
          <p className="text-lg text-blue-100 mb-8">
            Tạo mật khẩu mạnh để bảo vệ tài khoản của bạn khỏi các truy cập trái phép.
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="font-semibold mb-3">💡 Mẹo tạo mật khẩu mạnh:</h3>
            <ul className="space-y-2 text-sm text-blue-100">
              <li>• Sử dụng kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt</li>
              <li>• Tránh sử dụng thông tin cá nhân dễ đoán</li>
              <li>• Không sử dụng lại mật khẩu từ các tài khoản khác</li>
              <li>• Cân nhắc sử dụng trình quản lý mật khẩu</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
