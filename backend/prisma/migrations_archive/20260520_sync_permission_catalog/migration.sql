-- Sync permission catalog with current route usage

-- Insert or refresh supported permissions
INSERT INTO "permissions" ("resource", "action", "description") VALUES
  ('users', 'create', 'Create new users'),
  ('users', 'read', 'View user information'),
  ('users', 'update', 'Update user information'),
  ('users', 'delete', 'Delete users'),
  ('users', 'manage_roles', 'Assign roles to users'),

  ('departments', 'create', 'Create departments'),
  ('departments', 'read', 'View departments'),
  ('departments', 'update', 'Update departments'),
  ('departments', 'delete', 'Delete departments'),

  ('positions', 'create', 'Create positions'),
  ('positions', 'read', 'View positions'),
  ('positions', 'update', 'Update positions'),
  ('positions', 'delete', 'Delete positions'),

  ('documents', 'create', 'Upload documents'),
  ('documents', 'read', 'View documents'),
  ('documents', 'update', 'Update documents'),
  ('documents', 'delete', 'Delete documents'),
  ('documents', 'share', 'Share documents'),

  ('document_types', 'create', 'Create document types'),
  ('document_types', 'read', 'View document types'),
  ('document_types', 'update', 'Update document types'),
  ('document_types', 'delete', 'Delete document types'),

  ('workflows', 'create', 'Create workflow templates'),
  ('workflows', 'read', 'View workflow templates'),
  ('workflows', 'update', 'Update workflow templates'),
  ('workflows', 'delete', 'Delete workflow templates'),

  ('approvals', 'read', 'View approvals'),
  ('approvals', 'update', 'Approve, reject, request info, and comment on approvals'),

  ('sign_requests', 'create', 'Create sign requests'),
  ('sign_requests', 'read', 'View sign requests'),
  ('sign_requests', 'update', 'Update sign requests'),
  ('sign_requests', 'delete', 'Delete sign requests'),

  ('roles', 'create', 'Create custom roles'),
  ('roles', 'read', 'View roles'),
  ('roles', 'update', 'Update roles'),
  ('roles', 'delete', 'Delete roles'),

  ('audit_logs', 'read', 'View audit logs'),
  ('audit_logs', 'export', 'Export audit logs'),

  ('settings', 'read', 'View tenant settings'),
  ('settings', 'update', 'Update tenant settings'),

  ('external_orgs', 'create', 'Create external organizations'),
  ('external_orgs', 'read', 'View external organizations'),
  ('external_orgs', 'update', 'Update external organizations'),
  ('external_orgs', 'delete', 'Delete external organizations'),

  ('webhooks', 'create', 'Create webhooks'),
  ('webhooks', 'read', 'View webhooks'),
  ('webhooks', 'update', 'Update webhooks'),
  ('webhooks', 'delete', 'Delete webhooks')
ON CONFLICT ("resource", "action")
DO UPDATE SET "description" = EXCLUDED."description";

-- Remove legacy permissions no longer used by routes
DELETE FROM "permissions"
WHERE ("resource", "action") IN (
  ('settings', 'manage'),
  ('approvals', 'create'),
  ('approvals', 'delete'),
  ('sign_requests', 'approve')
);

-- Ensure default Admin roles in existing tenants receive the full normalized catalog
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'Admin'
  AND (p.resource, p.action) IN (
    ('users', 'create'), ('users', 'read'), ('users', 'update'), ('users', 'delete'), ('users', 'manage_roles'),
    ('departments', 'create'), ('departments', 'read'), ('departments', 'update'), ('departments', 'delete'),
    ('positions', 'create'), ('positions', 'read'), ('positions', 'update'), ('positions', 'delete'),
    ('documents', 'create'), ('documents', 'read'), ('documents', 'update'), ('documents', 'delete'), ('documents', 'share'),
    ('document_types', 'create'), ('document_types', 'read'), ('document_types', 'update'), ('document_types', 'delete'),
    ('workflows', 'create'), ('workflows', 'read'), ('workflows', 'update'), ('workflows', 'delete'),
    ('approvals', 'read'), ('approvals', 'update'),
    ('sign_requests', 'create'), ('sign_requests', 'read'), ('sign_requests', 'update'), ('sign_requests', 'delete'),
    ('roles', 'create'), ('roles', 'read'), ('roles', 'update'), ('roles', 'delete'),
    ('audit_logs', 'read'), ('audit_logs', 'export'),
    ('settings', 'read'), ('settings', 'update'),
    ('external_orgs', 'create'), ('external_orgs', 'read'), ('external_orgs', 'update'), ('external_orgs', 'delete'),
    ('webhooks', 'create'), ('webhooks', 'read'), ('webhooks', 'update'), ('webhooks', 'delete')
  )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
