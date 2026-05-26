ALTER TABLE document_permissions
ADD COLUMN IF NOT EXISTS scope VARCHAR(50);

ALTER TABLE document_permissions
ADD COLUMN IF NOT EXISTS permissions_json JSONB;

ALTER TABLE document_permissions
ADD COLUMN IF NOT EXISTS status_limit_json JSONB;
