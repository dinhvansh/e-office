"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { SIDEBAR_STRUCTURE } from "@/constants/sidebarItems";
import { filterSidebarByPermissions } from "@/lib/permissions";
import { ChevronLeft, ChevronRight, Settings, LogOut, User, FileSignature, Upload, Menu, X } from "lucide-react";
import { LoadingBar } from "@/components/ui/loading-bar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MobileBottomNav } from "@/components/ui/mobile-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tokens, user, tenant, logout, isLoading, permissions } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Filter sidebar based on user role
  const filteredSidebar = filterSidebarByPermissions(SIDEBAR_STRUCTURE, user?.role, permissions);

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
        "grid gap-0 transition-all duration-300 min-w-0",
        isCollapsed ? "md:grid-cols-[100px_1fr]" : "md:grid-cols-[280px_1fr]"
      )}>
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-50 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Desktop + Mobile */}
        <aside className={cn(
          "h-screen sticky top-0 flex-col border-r border-slate-200 bg-white shadow-xl overflow-visible transition-all duration-300 relative hide-scrollbar",
          isCollapsed ? "p-3" : "p-6",
          // Mobile styles
          "md:flex",
          isMobileMenuOpen 
            ? "fixed left-0 top-0 z-50 w-[280px] flex" 
            : "hidden"
        )}>
          {/* Toggle Button - Desktop only */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
            className="hidden md:block absolute -right-3 top-6 bg-white border border-slate-200 rounded-full p-1.5 shadow-md hover:shadow-lg hover:bg-slate-50 text-slate-600 transition-all duration-200 z-50"
            title={isCollapsed ? "Mở rộng" : "Thu gọn"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Close Button - Mobile only */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Đóng menu điều hướng"
            className="md:hidden absolute right-4 top-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>

          <div className={cn(
            "mb-6 space-y-2 pb-4 border-b border-slate-100",
            isCollapsed && "flex justify-center"
          )}>
            {isCollapsed ? (
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="w-10 h-10 object-contain" />
            ) : (
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="Logo" width={40} height={40} className="w-10 h-10 object-contain" />
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
        </aside>
        <div className="flex flex-col h-screen min-w-0 overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Mở menu điều hướng"
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            <div className="flex-1 md:flex-none">
              {/* Breadcrumb or page title can go here */}
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <NotificationBell />
              <div className="h-6 w-px bg-slate-200" />
              
              {/* User Menu Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-slate-50 rounded-lg p-1.5 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                    {user?.email?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-900">{user?.full_name || user?.email}</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.role ?? "user"}</p>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Thông tin cá nhân</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/profile?tab=avatar')}>
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Upload Avatar</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/profile?tab=signature')}>
                    <FileSignature className="mr-2 h-4 w-4" />
                    <span>Cài đặt chữ ký</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings/tenant')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Cài đặt</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          {/* Main content */}
          <main className="flex-1 p-3 md:p-6 space-y-3 md:space-y-6 overflow-y-auto overflow-x-hidden pb-20 md:pb-6 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav groups={filteredSidebar} />
    </div>
  );
}
