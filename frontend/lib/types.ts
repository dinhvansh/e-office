export type DocumentRecord = {
  id: number;
  tenant_id: number;
  owner_id: number | null;
  file_path: string;
  status: string | null;
  version: number;
  created_at: string;
  document_type_id?: number | null;
  document_number?: string | null;
};

export type DocumentType = {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  require_numbering: boolean;
  require_digital_signing: boolean;
  is_active: boolean;
  _count?: { documents: number };
  numbering_rules?: Array<{
    id: number;
    pattern: string;
    last_number: number;
  }>;
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
};
