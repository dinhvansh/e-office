ALTER TABLE document_permissions
ADD COLUMN IF NOT EXISTS permission_source TEXT NOT NULL DEFAULT 'baseline';

ALTER TABLE document_permissions
ADD COLUMN IF NOT EXISTS scope_department_id INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS document_permissions_document_id_subject_type_subject_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS document_permissions_lookup_key
ON document_permissions(document_id, permission_source, subject_type, subject_id, scope_department_id);
