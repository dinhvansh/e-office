-- Migration: Ultra-Minimal Version
-- Removes workflow, RBAC, and org structure tables
-- Keeps only core e-signature functionality

-- Step 1: Drop workflow-related tables
DROP TABLE IF EXISTS document_approvals CASCADE;
DROP TABLE IF EXISTS workflow_instances CASCADE;
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;

-- Step 2: Drop RBAC tables
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Step 3: Drop org structure tables
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS positions CASCADE;

-- Step 4: Drop document management extras
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS numbering_rules CASCADE;
DROP TABLE IF EXISTS external_organizations CASCADE;
DROP TABLE IF EXISTS document_permissions CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS document_tags CASCADE;
DROP TABLE IF EXISTS document_cc_emails CASCADE;
DROP TABLE IF EXISTS document_attachments CASCADE;

-- Step 5: Simplify users table
ALTER TABLE users DROP COLUMN IF EXISTS department_id;
ALTER TABLE users DROP COLUMN IF EXISTS manager_id;
ALTER TABLE users DROP COLUMN IF EXISTS position_id;
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Step 6: Simplify documents table
ALTER TABLE documents DROP COLUMN IF EXISTS document_type_id;
ALTER TABLE documents DROP COLUMN IF EXISTS department_id;
ALTER TABLE documents DROP COLUMN IF EXISTS numbering_rule_id;
ALTER TABLE documents DROP COLUMN IF EXISTS document_number;
ALTER TABLE documents DROP COLUMN IF EXISTS priority_level;
ALTER TABLE documents DROP COLUMN IF EXISTS confidential_level;
ALTER TABLE documents DROP COLUMN IF EXISTS visibility_scope;
ALTER TABLE documents DROP COLUMN IF EXISTS effective_date;
ALTER TABLE documents DROP COLUMN IF EXISTS expiration_date;
ALTER TABLE documents DROP COLUMN IF EXISTS issued_date;
ALTER TABLE documents DROP COLUMN IF EXISTS version;

-- Simplify to minimal fields
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';

-- Step 7: Update remaining tables to match new schema
-- sign_requests - minimal changes needed
-- signers - no changes needed
-- sign_request_fields - no changes needed
-- sign_request_field_values - no changes needed
-- audit_logs - simplify user tracking
ALTER TABLE audit_logs DROP COLUMN IF EXISTS user_id;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- Step 8: Verify remaining tables
-- Should have exactly 8 tables:
-- 1. tenants
-- 2. users  
-- 3. documents
-- 4. sign_requests
-- 5. signers
-- 6. sign_request_fields
-- 7. sign_request_field_values
-- 8. audit_logs

-- Optional: Add useful indexes
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_signers_status ON signers(status);
CREATE INDEX IF NOT EXISTS idx_signers_email ON signers(email);
