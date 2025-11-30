import { documents } from '@prisma/client';

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
  document_number: string | null;
  numbering_rule_id: number | null;
  title: string | null;
  summary: string | null;
  priority_level: string | null;
  confidential_level: string | null;
  visibility_scope: string | null;
  effective_date: Date | null;
  expiration_date: Date | null;
  issued_date: Date | null;
  sign_request_id: number | null;
  created_at: Date;
}

/**
 * Map document entity to response DTO
 * Excludes file_path for security
 */
export function toDocumentDTO(doc: any): DocumentResponseDTO {
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
    document_number: doc.document_number || null,
    numbering_rule_id: doc.numbering_rule_id || null,
    title: doc.title || null,
    summary: doc.summary || null,
    priority_level: doc.priority_level || null,
    confidential_level: doc.confidential_level || null,
    visibility_scope: doc.visibility_scope || null,
    effective_date: doc.effective_date || null,
    expiration_date: doc.expiration_date || null,
    issued_date: doc.issued_date || null,
    sign_request_id: doc.sign_request_id ?? null,
    created_at: doc.created_at,
  };
}

/**
 * Map array of documents to DTOs
 */
export function toDocumentDTOs(docs: any[]): DocumentResponseDTO[] {
  return docs.map(toDocumentDTO);
}
