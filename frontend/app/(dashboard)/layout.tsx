"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Tổng quan", caption: "Số liệu hệ thống" },
  { href: "/documents", label: "Tài liệu", caption: "Upload & quản trị" },
  { href: "/sign-requests", label: "Quy trình ký", caption: "Theo dõi tiến độ" },
  { href: "/document-types", label: "Loại văn bản", caption: "Phân loại & đánh số" },
  { href: "/users", label: "Người dùng", caption: "Quản lý tài khoản" },
  { href: "/departments", label: "Phòng ban", caption: "Cấu trúc tổ chức" },
  { href: "/roles", label: "Vai trò", caption: "Phân quyền hệ thống" },
  { href: "/webhooks", label: "Webhooks", caption: "Thông báo tự động" },
  { href: "/settings/tenant", label: "Doanh nghiệp", caption: "Branding & domain" },
  { href: "/settings/billing", label: "Gói dịch vụ", caption: "License & usage" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tokens, user, tenant, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !tokens) {
      router.replace("/login");
    }
  }, [isLoading, router, tokens]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Đang tải workspace...</div>;
  }

  if (!tokens) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),transparent_45%)] pb-10">
      <div className="grid gap-6 px-4 py-6 md:grid-cols-[260px_1fr] md:px-8">
        <aside className="hidden min-h-[80vh] flex-col rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur md:flex">
          <div className="mb-8 space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Workspace</p>
            <p className="text-2xl font-semibold text-slate-900">{tenant?.name ?? "WP Sign"}</p>
            <span className="chip mt-2">{tenant?.plan ?? "plan"}</span>
          </div>
          <nav className="flex flex-1 flex-col gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-2xl border border-transparent px-4 py-3 text-sm transition hover:border-slate-200 hover:bg-white",
                    active && "border-brand-200 bg-white shadow-lg shadow-brand-100/70",
                  )}
                >
                  <p className={cn("font-semibold", active ? "text-brand-600" : "text-slate-700")}>{item.label}</p>
                  <p className="text-xs text-slate-400">{item.caption}</p>
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600 shadow-inner shadow-white/40">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Đăng nhập</p>
              <p className="font-semibold text-slate-800">{user?.email}</p>
              <p className="text-xs text-slate-500">Vai trò: {user?.role ?? "user"}</p>
            </div>
            <button
              onClick={logout}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
            >
              Đăng xuất
            </button>
          </div>
        </aside>
        <main className="space-y-6">
          <section className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tenant</p>
                <h1 className="text-3xl font-semibold text-slate-900">{tenant?.name ?? "Workspace"}</h1>
                <p className="text-sm text-slate-500">
                  Giám sát tài liệu, license và quy trình ký cho {tenant?.domain ?? "multi-tenant"}.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/documents" className="button-primary">
                  + Tải tài liệu
                </Link>
                <Link
                  href="/sign-requests"
                  className="inline-flex items-center rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                >
                  Tạo quy trình ký
                </Link>
              </div>
            </div>
          </section>
          {children}
        </main>
      </div>
    </div>
  );
}
