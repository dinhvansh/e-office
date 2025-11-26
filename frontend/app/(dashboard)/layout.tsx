"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { SIDEBAR_STRUCTURE } from "@/constants/sidebarItems";
import { filterSidebarByPermissions } from "@/lib/permissions";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tokens, user, tenant, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Filter sidebar based on user role
  const filteredSidebar = filterSidebarByPermissions(SIDEBAR_STRUCTURE, user?.role);

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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <LoadingBar />
      <div className={cn(
        "grid gap-0 transition-all duration-300",
        isCollapsed ? "md:grid-cols-[100px_1fr]" : "md:grid-cols-[280px_1fr]"
      )}>
        <aside className={cn(
          "hidden h-screen sticky top-0 flex-col border-r border-slate-200 bg-white shadow-xl md:flex overflow-visible transition-all duration-300 relative hide-scrollbar",
          isCollapsed ? "p-3" : "p-6"
        )}>
          {/* Toggle Button */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-6 bg-white border border-slate-200 rounded-full p-1.5 shadow-md hover:shadow-lg hover:bg-slate-50 text-slate-600 transition-all duration-200 z-50"
            title={isCollapsed ? "Mở rộng" : "Thu gọn"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          <div className={cn(
            "mb-6 space-y-2 pb-4 border-b border-slate-100",
            isCollapsed && "flex justify-center"
          )}>
            {isCollapsed ? (
              <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            ) : (
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                <div>
                  <p className="text-lg font-bold text-slate-900">{tenant?.name ?? "WP Sign"}</p>
                  <p className="text-xs text-slate-500">{tenant?.plan ?? "Enterprise"}</p>
                </div>
              </div>
            )}
          </div>
          <nav className="flex flex-1 flex-col gap-6 overflow-y-auto hide-scrollbar">
            {filteredSidebar.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Group Label */}
                {!isCollapsed ? (
                  <h3 className="px-4 mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    {group.groupLabel}
                  </h3>
                ) : (
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-2 mb-3 mt-1" />
                )}
                
                {/* Group Items */}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={isCollapsed ? item.label : ""}
                        className={cn(
                          "group rounded-lg text-sm transition-all duration-200 flex relative",
                          isCollapsed 
                            ? "justify-center py-3 px-2 mx-1" 
                            : "items-start gap-3 px-3 py-2.5 mx-1",
                          active 
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/40 scale-[1.02]" 
                            : "text-slate-700 hover:bg-slate-50 hover:scale-[1.01]"
                        )}
                      >
                        {/* Active indicator bar */}
                        {active && !isCollapsed && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                        )}
                        
                        <div className={cn(
                          "flex-shrink-0 transition-transform group-hover:scale-110",
                          isCollapsed ? "" : "mt-0.5 ml-2",
                          active ? "text-white" : item.color
                        )}>
                          <item.icon className={cn(isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
                        </div>
                        
                        {!isCollapsed && (
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-semibold leading-tight", active ? "text-white" : "text-slate-900 group-hover:text-blue-600")}>{item.label}</p>
                            {item.caption && (
                              <p className={cn("text-[11px] truncate mt-0.5", active ? "text-blue-100" : "text-slate-500 group-hover:text-slate-600")}>{item.caption}</p>
                            )}
                          </div>
                        )}

                        {/* Tooltip when collapsed */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-xl">
                            <div className="font-semibold">{item.label}</div>
                            {item.caption && (
                              <div className="text-slate-300 text-[10px] mt-0.5">{item.caption}</div>
                            )}
                            {/* Arrow */}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className={cn(
            "mt-auto space-y-3 rounded-xl border border-slate-200 bg-slate-50 text-sm",
            isCollapsed ? "p-2 flex flex-col items-center" : "p-4"
          )}>
            {isCollapsed ? (
              <>
                <div 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:scale-105 transition-transform"
                  title={user?.email}
                >
                  {user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <button
                  onClick={logout}
                  className="w-full rounded-lg bg-white border border-slate-200 p-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:border-slate-300"
                  title="Đăng xuất"
                >
                  ↪
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Đăng nhập</p>
                  <p className="font-semibold text-slate-900 truncate">{user?.email}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      {user?.role ?? "user"}
                    </span>
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:border-slate-300"
                >
                  Đăng xuất
                </button>
              </>
            )}
          </div>
        </aside>
        <main className="p-6 space-y-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
