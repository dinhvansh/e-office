export type DocumentRecord = {
  id: number;
  tenant_id: number;
  owner_id: number | null;
  file_path: string;
  status: string | null;
  version: number;
  created_at: string;
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
