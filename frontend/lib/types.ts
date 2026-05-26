export type DocumentRecord = {
  id: number;
  tenant_id: number;
  owner_id: number | null;
  original_file_name: string | null;
  title?: string | null;
  status: string | null;
  version: number;
  created_at: string;
  document_type_id?: number | null;
  document_number?: string | null;
  confidential_level?: string | null;
  visibility_scope?: string | null;
  sign_request_id?: number | null;
};

export type DocumentType = {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  require_numbering: boolean;
  require_digital_signing: boolean;
  require_approval?: boolean;
  default_workflow_id?: number | null;
  allow_workflow_override?: boolean;
  is_active: boolean;
  _count?: { documents: number };
  numbering_rules?: Array<{
    id: number;
    pattern: string;
    last_number: number;
  }>;
};

export type DocumentTypePolicy = {
  version?: number;
  visibility: {
    default_visibility_scope:
      | 'private'
      | 'creator_only'
      | 'department'
      | 'department_and_manager'
      | 'workflow_only'
      | 'company'
      | 'custom_acl';
    default_security_level: 'normal' | 'internal' | 'confidential' | 'secret';
    auto_assign_creator_department: boolean;
    force_private_on_create: boolean;
  };
  acl_templates: Array<{
    id: string;
    subject_type:
      | 'creator'
      | 'creator_department'
      | 'creator_manager'
      | 'specific_department'
      | 'specific_role'
      | 'specific_user'
      | 'workflow_participant'
      | 'cc_user'
      | 'legacy_position_in_department';
    subject_id?: number | null;
    scope?: 'OWN' | 'DEPARTMENT' | 'COMPANY' | 'ASSIGNED_ONLY' | 'ALL' | null;
    permissions: Array<'CREATE' | 'VIEW' | 'DOWNLOAD' | 'EDIT' | 'COMMENT' | 'APPROVE' | 'SIGN' | 'SHARE' | 'DELETE'>;
    status_limit?: string[] | null;
    is_active: boolean;
    scope_department_id?: number | null;
  }>;
  advanced_policies: Array<{
    id: string;
    name: string;
    priority: number;
    effect: 'ALLOW' | 'DENY';
    condition_json: Record<string, unknown>;
    permission_json: Record<string, unknown>;
    is_active: boolean;
  }>;
  legacy_detail_permissions?: Array<{
    subject_type: 'user' | 'department' | 'position_in_department';
    subject_id: number;
    scope_department_id?: number;
    can_read?: boolean;
    can_edit?: boolean;
    can_approve?: boolean;
    can_share?: boolean;
    can_delete?: boolean;
  }>;
  legacy_rules?: {
    allow_roles?: string[];
    deny_roles?: string[];
    allow_departments?: number[];
    deny_departments?: number[];
    min_position_level?: number | null;
  };
};

export type TenantProfile = {
  id: number;
  name: string | null;
  domain: string | null;
  plan: string | null;
  status: string | null;
  created_at: string;
};

export type SignRequestRecord = {
  id: number;
  tenant_id: number;
  document_id: number;
  title: string | null;
  message: string | null;
  workflow_type: string | null;
  status: string | null;
  deadline: string | null;
  created_at: string;
  signers: SignerRecord[];
};

export type SignerRecord = {
  id: number;
  sign_request_id: number;
  email: string | null;
  name: string | null;
  role: string | null;
  status: string | null;
  signed_at: string | null;
};

export type AuditLogRecord = {
  id: number;
  document_id: number;
  event: string | null;
  user_id: number | null;
  ip: string | null;
  ua: string | null;
  created_at: string;
  user?: {
    id: number;
    full_name: string | null;
    email: string;
  } | null;
};

export type DocumentAuditSummary = {
  totalViews: number;
  totalDownloads: number;
  totalSignedViews: number;
  totalSignedDownloads: number;
  totalAttachmentDownloads: number;
  viewers: Array<{
    user_id: number | null;
    full_name: string | null;
    email: string | null;
    views: number;
    downloads: number;
    signedViews: number;
    signedDownloads: number;
    attachmentDownloads: number;
    lastActivityAt: string | null;
  }>;
};
