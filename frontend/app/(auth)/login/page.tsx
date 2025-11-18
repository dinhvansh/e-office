"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login, tokens } = useAuth();
  const [email, setEmail] = useState("admin@acme.local");
  const [password, setPassword] = useState("secret123");
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
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg rounded-[32px] border border-white/60 bg-white/80 p-10 shadow-[0_25px_70px_rgba(15,23,42,0.15)] backdrop-blur">
        <div className="mb-8 space-y-2">
          <p className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            WP Sign
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Đăng nhập Workspace</h1>
          <p className="text-sm text-slate-500">Quản lý tài liệu, luồng ký và license trong một màn hình.</p>
        </div>
        {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-inner shadow-red-100">{error}</p>}
        <label className="mb-4 block text-sm font-medium text-slate-600">
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-2" type="email" required />
        </label>
        <label className="mb-6 block text-sm font-medium text-slate-600">
          Mật khẩu
          <input value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-2" type="password" required />
        </label>
        <button type="submit" disabled={isSubmitting} className="button-primary w-full">
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">Được bảo vệ bởi hệ thống license WP Sign.</p>
      </form>
    </div>
  );
}
