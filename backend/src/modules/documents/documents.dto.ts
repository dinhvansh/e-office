import { document_attachments, document_cc_emails, document_types, documents, users } from '@prisma/client';

type DocumentDTOInput = documents & {
  document_type?: Pick<document_types, 'name'> | null;
  cc_emails?: document_cc_emails[];
  attachments?: document_attachments[];
  superseded_by?: Array<{ id: number }>;
};

/**
 * Document response DTO - excludes sensitive internal fields
 * Security: file_path is not exposed to prevent information disclosure
 */
export interface DocumentResponseDTO {
  id: number;
  tenant_id: number;
  owner_id: number | null;
  document_type_id: number | null;
  document_type: string | null; // Document type name
  signed_file_path: string | null; // For progressive PDF
  original_file_name: string | null;
  hash: string | null;
  status: string | null;
  version: number;
  root_document_id: number | null;
  supersedes_document_id: number | null;
  revision_no: number;
  revision_comment: string | null;
  is_current_revision?: boolean;
  is_superseded?: boolean;
  source_kind: string;
  external_signature_status: string | null;
  document_number: string | null;
  numbering_rule_id: number | null;
  title: string | null;
  summary: string | null;
  priority_level: string | null;
  confidential_level: string | null;
  visibility_scope: string | null;
  effective_date: Date | null;
  expiration_date: Date | null;
  validity_status: 'no_expiry' | 'upcoming' | 'effective' | 'expiring_soon' | 'expired';
  issued_date: Date | null;
  sign_request_id: number | null;
  created_at: Date;
  cc_emails?: string[];
  attachments?: DocumentAttachmentDTO[];
}

export interface DocumentAttachmentDTO {
  id: number;
  file_name: string;
  file_size: string | null;
  file_type: string | null;
  uploaded_at: Date;
  attachment_kind: string;
  status: string;
  withdrawn_at: Date | null;
  withdraw_reason: string | null;
  uploaded_by?: { id: number; full_name: string | null; email: string } | null;
  comment_id: number | null;
}

type AttachmentWithUploader = document_attachments & {
  uploader?: Pick<users, 'id' | 'full_name' | 'email'> | null;
};

export function toDocumentAttachmentDTO(attachment: AttachmentWithUploader): DocumentAttachmentDTO {
  return {
    id: attachment.id,
    file_name: attachment.file_name,
    file_size: attachment.file_size == null ? null : attachment.file_size.toString(),
    file_type: attachment.file_type || null,
    uploaded_at: attachment.uploaded_at,
    attachment_kind: attachment.attachment_kind,
    status: attachment.status,
    withdrawn_at: attachment.withdrawn_at,
    withdraw_reason: attachment.withdraw_reason,
    uploaded_by: attachment.uploader
      ? { id: attachment.uploader.id, full_name: attachment.uploader.full_name, email: attachment.uploader.email }
      : null,
    comment_id: attachment.comment_id,
  };
}

export function toDocumentAttachmentDTOs(attachments: AttachmentWithUploader[] = []): DocumentAttachmentDTO[] {
  return attachments.map(toDocumentAttachmentDTO);
}

/**
 * Map document entity to response DTO
 * Excludes file_path for security
 */
export function toDocumentDTO(doc: DocumentDTOInput): DocumentResponseDTO {
  const now = new Date();
  const validityStatus: DocumentResponseDTO['validity_status'] = !doc.expiration_date
    ? 'no_expiry'
    : doc.expiration_date < now
      ? 'expired'
      : doc.effective_date && doc.effective_date > now
        ? 'upcoming'
        : (doc.expiration_date.getTime() - now.getTime()) <= 30 * 24 * 60 * 60 * 1000
          ? 'expiring_soon'
          : 'effective';
  return {
    id: doc.id,
    tenant_id: doc.tenant_id,
    owner_id: doc.owner_id,
    document_type_id: doc.document_type_id,
    document_type: doc.document_type?.name || null,
    signed_file_path: doc.signed_file_path || null,
    original_file_name: doc.original_file_name || null,
    hash: doc.hash,
    status: doc.status,
    version: doc.version,
    root_document_id: doc.root_document_id ?? null,
    supersedes_document_id: doc.supersedes_document_id ?? null,
    revision_no: doc.revision_no,
    revision_comment: doc.revision_comment || null,
    is_current_revision: Array.isArray(doc.superseded_by) ? doc.superseded_by.length === 0 : undefined,
    is_superseded: Array.isArray(doc.superseded_by) ? doc.superseded_by.length > 0 : undefined,
    source_kind: doc.source_kind,
    external_signature_status: doc.external_signature_status ?? null,
    document_number: doc.document_number || null,
    numbering_rule_id: doc.numbering_rule_id || null,
    title: doc.title || null,
    summary: doc.summary || null,
    priority_level: doc.priority_level || null,
    confidential_level: doc.confidential_level || null,
    visibility_scope: doc.visibility_scope || null,
    effective_date: doc.effective_date || null,
    expiration_date: doc.expiration_date || null,
    validity_status: validityStatus,
    issued_date: doc.issued_date || null,
    sign_request_id: doc.sign_request_id ?? null,
    created_at: doc.created_at,
    cc_emails: doc.cc_emails?.map((item) => item.email).filter((email): email is string => Boolean(email)),
    attachments: Array.isArray(doc.attachments) ? toDocumentAttachmentDTOs(doc.attachments) : undefined,
  };
}

/**
 * Map array of documents to DTOs
 */
export function toDocumentDTOs(docs: DocumentDTOInput[]): DocumentResponseDTO[] {
  return docs.map(toDocumentDTO);
}
