"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login, tokens } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (tokens) {
      router.replace("/");
    }
  }, [router, tokens]);

  if (tokens) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Redirecting...</div>;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#dbeafe,_transparent_55%)] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-br from-blue-500/40 to-slate-900/60 blur-3xl md:block" />
      <form
        onSubmit={handleSubmit}
        autoComplete="on"
        className="relative w-full max-w-lg rounded-[32px] border border-white/60 bg-white/80 p-10 shadow-[0_25px_70px_rgba(15,23,42,0.15)] backdrop-blur"
      >
        <div className="mb-8 space-y-4">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Logo" width={128} height={64} className="h-16 w-auto object-contain" priority />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900">Đăng nhập Workspace</h1>
            <p className="text-sm text-slate-500">Quản lý tài liệu và luồng ký trong một màn hình.</p>
          </div>
        </div>
        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 shadow-inner shadow-red-100 border border-red-100">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">Đăng nhập thất bại</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        <label className="mb-4 block text-sm font-medium text-slate-600">
          Email
          <input
            id="login-email"
            name="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-2"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </label>
        <label className="mb-2 block text-sm font-medium text-slate-600">
          Mật khẩu
          <input
            id="login-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-2"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <div className="mb-6 flex justify-end">
          <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Quên mật khẩu?
          </a>
        </div>
        <button type="submit" disabled={isSubmitting} className="button-primary w-full">
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <div className="hidden">
          <p className="text-sm text-slate-600">
            Chưa có tài khoản?{' '}
            <span className="text-slate-500">
              Đăng ký ngay
            </span>
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Nền tảng E-Office nội bộ.</p>
      </form>
    </div>
  );
}
