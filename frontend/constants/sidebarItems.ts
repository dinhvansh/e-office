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
  LucideIcon,
  Archive
} from "lucide-react";
import type { TranslationKey } from "@/i18n";

export interface SidebarItem {
  labelKey: TranslationKey;
  href: string;
  icon: LucideIcon;
  captionKey?: TranslationKey;
  color?: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

export interface SidebarGroup {
  groupLabelKey: TranslationKey;
  items: SidebarItem[];
}

export const SIDEBAR_STRUCTURE: SidebarGroup[] = [
  {
    groupLabelKey: "navigation.group.workspace",
    items: [
      {
        labelKey: "navigation.dashboard.label",
        href: "/",
        icon: LayoutDashboard,
        captionKey: "navigation.dashboard.caption",
        color: "text-blue-600"
      },
      {
        labelKey: "navigation.signRequests.label",
        href: "/sign-requests",
        icon: PenTool,
        captionKey: "navigation.signRequests.caption",
        color: "text-green-600"
      },
      {
        labelKey: "navigation.documents.label",
        href: "/documents",
        icon: FileText,
        captionKey: "navigation.documents.caption",
        color: "text-purple-600",
        requiredPermissions: ["documents:read"]
      },
      {
        labelKey: "navigation.myTasks.label",
        href: "/my-tasks",
        icon: CheckSquare,
        captionKey: "navigation.myTasks.caption",
        color: "text-amber-600"
      },
    ]
  },
  {
    groupLabelKey: "navigation.group.organization",
    items: [
      {
        labelKey: "navigation.users.label",
        href: "/users",
        icon: Users,
        captionKey: "navigation.users.caption",
        color: "text-indigo-600",
        requiredPermissions: ["users:read"]
      },
      {
        labelKey: "navigation.departments.label",
        href: "/departments",
        icon: Building,
        captionKey: "navigation.departments.caption",
        color: "text-teal-600",
        requiredPermissions: ["departments:read"]
      },
      {
        labelKey: "navigation.roles.label",
        href: "/roles",
        icon: Shield,
        captionKey: "navigation.roles.caption",
        color: "text-rose-600",
        requiredPermissions: ["roles:read"]
      },
      {
        labelKey: "navigation.positions.label",
        href: "/positions",
        icon: Briefcase,
        captionKey: "navigation.positions.caption",
        color: "text-violet-600",
        requiredPermissions: ["positions:read"]
      },
    ]
  },
  {
    groupLabelKey: "navigation.group.configuration",
    items: [
      {
        labelKey: "navigation.system.label",
        href: "/settings/system",
        icon: Mail,
        captionKey: "navigation.system.caption",
        color: "text-emerald-600",
        requiredPermissions: ["settings:read"]
      },
      {
        labelKey: "navigation.documentTypes.label",
        href: "/document-types",
        icon: FileType,
        captionKey: "navigation.documentTypes.caption",
        color: "text-orange-600",
        requiredPermissions: ["document_types:read"]
      },
      {
        labelKey: "navigation.workflows.label",
        href: "/workflows",
        icon: Workflow,
        captionKey: "navigation.workflows.caption",
        color: "text-blue-600",
        requiredPermissions: ["workflows:read"]
      },
      {
        labelKey: "navigation.externalOrgs.label",
        href: "/external-orgs",
        icon: Building2,
        captionKey: "navigation.externalOrgs.caption",
        color: "text-cyan-600",
        requiredPermissions: ["external_orgs:read"]
      },
      {
        labelKey: "navigation.tenant.label",
        href: "/settings/tenant",
        icon: Settings,
        captionKey: "navigation.tenant.caption",
        color: "text-slate-600",
        requiredPermissions: ["settings:read"]
      },
      {
        labelKey: "navigation.webhooks.label",
        href: "/webhooks",
        icon: Webhook,
        captionKey: "navigation.webhooks.caption",
        color: "text-amber-600",
        requiredPermissions: ["webhooks:read"]
      },
    ]
  },
  { groupLabelKey: "navigation.group.archive", items: [{ labelKey: "navigation.archive.label", href: "/archive", icon: Archive, captionKey: "navigation.archive.caption", color: "text-slate-600", requiredPermissions: ["archive:view"] }] }
];
