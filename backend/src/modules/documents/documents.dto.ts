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
export function toDocumentDTO(doc: documents): DocumentResponseDTO {
  return {
    id: doc.id,
    tenant_id: doc.tenant_id,
    owner_id: doc.owner_id,
    document_type_id: doc.document_type_id,
    original_file_name: (doc as any).original_file_name || null,
    hash: doc.hash,
    status: doc.status,
    version: doc.version,
    document_number: (doc as any).document_number || null,
    numbering_rule_id: (doc as any).numbering_rule_id || null,
    title: (doc as any).title || null,
    summary: (doc as any).summary || null,
    priority_level: (doc as any).priority_level || null,
    confidential_level: (doc as any).confidential_level || null,
    visibility_scope: (doc as any).visibility_scope || null,
    effective_date: (doc as any).effective_date || null,
    expiration_date: (doc as any).expiration_date || null,
    issued_date: (doc as any).issued_date || null,
    sign_request_id: (doc as any).sign_request_id ?? null,
    created_at: doc.created_at,
  };
}

/**
 * Map array of documents to DTOs
 */
export function toDocumentDTOs(docs: documents[]): DocumentResponseDTO[] {
  return docs.map(toDocumentDTO);
}
