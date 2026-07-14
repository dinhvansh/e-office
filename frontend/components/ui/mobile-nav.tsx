"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { SidebarGroup, SidebarItem } from "@/constants/sidebarItems";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const PRIMARY_NAV_LIMIT = 4;

const isItemActive = (pathname: string, item: SidebarItem) =>
  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

export function MobileBottomNav({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname();
  const items = groups.flatMap((group) => group.items);
  const primaryItems = items.slice(0, PRIMARY_NAV_LIMIT);
  const overflowItems = items.slice(PRIMARY_NAV_LIMIT);
  const hasActiveOverflowItem = overflowItems.some((item) => isItemActive(pathname, item));
  const columnCount = overflowItems.length > 0 ? primaryItems.length + 1 : primaryItems.length;

  return (
    <nav aria-label="Điều hướng chính trên thiết bị di động" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg safe-area-inset-bottom">
      <div className="grid h-16 w-full" style={{ gridTemplateColumns: `repeat(${columnCount || 1}, minmax(0, 1fr))` }}>
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset",
                active ? "text-blue-600 bg-blue-50" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50",
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        {overflowItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Mở thêm mục điều hướng"
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset",
                hasActiveOverflowItem ? "text-blue-600 bg-blue-50" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50",
              )}
            >
              <MoreHorizontal className={cn("w-5 h-5", hasActiveOverflowItem && "scale-110")} />
              <span className="text-[10px] font-medium">Thêm</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="mb-2 max-h-80 w-64 overflow-y-auto">
              {overflowItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} aria-current={isItemActive(pathname, item) ? "page" : undefined} className="flex cursor-pointer items-center gap-3">
                      <Icon className={cn("h-4 w-4", item.color)} />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
