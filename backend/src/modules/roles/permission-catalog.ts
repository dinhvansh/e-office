export interface PermissionCatalogEntry {
  resource: string;
  action: string;
  description: string;
}

export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { resource: "users", action: "create", description: "Create new users" },
  { resource: "users", action: "read", description: "View user information" },
  { resource: "users", action: "update", description: "Update user information" },
  { resource: "users", action: "delete", description: "Delete users" },
  { resource: "users", action: "manage_roles", description: "Assign roles to users" },

  { resource: "departments", action: "create", description: "Create departments" },
  { resource: "departments", action: "read", description: "View departments" },
  { resource: "departments", action: "update", description: "Update departments" },
  { resource: "departments", action: "delete", description: "Delete departments" },

  { resource: "positions", action: "create", description: "Create positions" },
  { resource: "positions", action: "read", description: "View positions" },
  { resource: "positions", action: "update", description: "Update positions" },
  { resource: "positions", action: "delete", description: "Delete positions" },

  { resource: "documents", action: "create", description: "Upload documents" },
  { resource: "documents", action: "read", description: "View documents" },
  { resource: "documents", action: "update", description: "Update documents" },
  { resource: "documents", action: "delete", description: "Delete documents" },
  { resource: "documents", action: "share", description: "Share documents" },

  { resource: "document_types", action: "create", description: "Create document types" },
  { resource: "document_types", action: "read", description: "View document types" },
  { resource: "document_types", action: "update", description: "Update document types" },
  { resource: "document_types", action: "delete", description: "Delete document types" },

  { resource: "workflows", action: "create", description: "Create workflow templates" },
  { resource: "workflows", action: "read", description: "View workflow templates" },
  { resource: "workflows", action: "update", description: "Update workflow templates" },
  { resource: "workflows", action: "delete", description: "Delete workflow templates" },

  { resource: "approvals", action: "read", description: "View approvals" },
  { resource: "approvals", action: "update", description: "Approve, reject, request info, and comment on approvals" },

  { resource: "sign_requests", action: "create", description: "Create sign requests" },
  { resource: "sign_requests", action: "read", description: "View sign requests" },
  { resource: "sign_requests", action: "update", description: "Update sign requests" },
  { resource: "sign_requests", action: "delete", description: "Delete sign requests" },

  { resource: "roles", action: "create", description: "Create custom roles" },
  { resource: "roles", action: "read", description: "View roles" },
  { resource: "roles", action: "update", description: "Update roles" },
  { resource: "roles", action: "delete", description: "Delete roles" },

  { resource: "audit_logs", action: "read", description: "View audit logs" },
  { resource: "audit_logs", action: "export", description: "Export audit logs" },

  { resource: "settings", action: "read", description: "View tenant settings" },
  { resource: "settings", action: "update", description: "Update tenant settings" },

  { resource: "external_orgs", action: "create", description: "Create external organizations" },
  { resource: "external_orgs", action: "read", description: "View external organizations" },
  { resource: "external_orgs", action: "update", description: "Update external organizations" },
  { resource: "external_orgs", action: "delete", description: "Delete external organizations" },

  { resource: "webhooks", action: "create", description: "Create webhooks" },
  { resource: "webhooks", action: "read", description: "View webhooks" },
  { resource: "webhooks", action: "update", description: "Update webhooks" },
  { resource: "webhooks", action: "delete", description: "Delete webhooks" },
];

export const ADMIN_PERMISSION_KEYS = new Set(
  PERMISSION_CATALOG.map((permission) => `${permission.resource}.${permission.action}`)
);

