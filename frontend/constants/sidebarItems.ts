import {
  LayoutDashboard,
  FileText,
  PenTool,
  Users,
  Building,
  Shield,
  FileType,
  Settings,
  Mail,
  Webhook,
  Building2,
  Workflow,
  CheckSquare,
  Briefcase,
  LucideIcon
} from "lucide-react";

export interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  caption?: string;
  color?: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

export interface SidebarGroup {
  groupLabel: string;
  items: SidebarItem[];
}

export const SIDEBAR_STRUCTURE: SidebarGroup[] = [
  {
    groupLabel: "Workspace",
    items: [
      {
        label: "Tổng quan",
        href: "/",
        icon: LayoutDashboard,
        caption: "Số liệu hệ thống",
        color: "text-blue-600"
      },
      {
        label: "Quy trình ký",
        href: "/sign-requests",
        icon: PenTool,
        caption: "Theo dõi tiến độ",
        color: "text-green-600"
      },
      {
        label: "Tài liệu",
        href: "/documents",
        icon: FileText,
        caption: "Upload & quản trị",
        color: "text-purple-600",
        requiredPermissions: ["documents:read"]
      },
      {
        label: "Công việc của tôi",
        href: "/my-tasks",
        icon: CheckSquare,
        caption: "Phê duyệt & Ký điện tử",
        color: "text-amber-600"
      },
    ]
  },
  {
    groupLabel: "Tổ chức",
    items: [
      {
        label: "Người dùng",
        href: "/users",
        icon: Users,
        caption: "Quản lý tài khoản",
        color: "text-indigo-600",
        requiredPermissions: ["users:read"]
      },
      {
        label: "Phòng ban",
        href: "/departments",
        icon: Building,
        caption: "Cấu trúc tổ chức",
        color: "text-teal-600",
        requiredPermissions: ["departments:read"]
      },
      {
        label: "Vai trò & Quyền",
        href: "/roles",
        icon: Shield,
        caption: "Phân quyền hệ thống",
        color: "text-rose-600",
        requiredPermissions: ["roles:read"]
      },
      {
        label: "Chức danh",
        href: "/positions",
        icon: Briefcase,
        caption: "Quản lý chức danh",
        color: "text-violet-600",
        requiredPermissions: ["positions:read"]
      },
    ]
  },
  {
    groupLabel: "Cấu hình",
    items: [
      {
        label: "Hệ thống & SMTP",
        href: "/settings/system",
        icon: Mail,
        caption: "Email, test SMTP & watermark",
        color: "text-emerald-600",
        requiredPermissions: ["settings:read"]
      },
      {
        label: "Loại văn bản",
        href: "/document-types",
        icon: FileType,
        caption: "Phân loại & đánh số",
        color: "text-orange-600",
        requiredPermissions: ["document_types:read"]
      },
      {
        label: "Quy trình phê duyệt",
        href: "/workflows",
        icon: Workflow,
        caption: "Cấu hình workflow",
        color: "text-blue-600",
        requiredPermissions: ["workflows:read"]
      },
      {
        label: "Tổ chức ngoài",
        href: "/external-orgs",
        icon: Building2,
        caption: "Đối tác & cơ quan",
        color: "text-cyan-600",
        requiredPermissions: ["external_orgs:read"]
      },
      {
        label: "Doanh nghiệp",
        href: "/settings/tenant",
        icon: Settings,
        caption: "Branding & domain",
        color: "text-slate-600",
        requiredPermissions: ["settings:read"]
      },
      {
        label: "Webhooks",
        href: "/webhooks",
        icon: Webhook,
        caption: "Thông báo tự động",
        color: "text-amber-600",
        requiredPermissions: ["webhooks:read"]
      },
    ]
  }
];
