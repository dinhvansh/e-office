-- Managers remain an organizational relationship (users.manager_id and
-- department leadership), but are no longer a privileged RBAC role.
CREATE TEMP TABLE "_manager_roles_to_remove" ON COMMIT DROP AS
SELECT "id", "tenant_id"
FROM "roles"
WHERE LOWER("name") = 'manager';

-- Every former Manager keeps the baseline permissions required to upload,
-- view and act on assigned approvals.
INSERT INTO "roles" ("tenant_id", "name", "description", "is_system", "created_at")
SELECT DISTINCT manager_role."tenant_id", 'User', 'Basic document and approval operations', TRUE, CURRENT_TIMESTAMP
FROM "_manager_roles_to_remove" manager_role
WHERE NOT EXISTS (
  SELECT 1
  FROM "roles" existing_user_role
  WHERE existing_user_role."tenant_id" = manager_role."tenant_id"
    AND LOWER(existing_user_role."name") = 'user'
);

INSERT INTO "user_roles" ("user_id", "role_id", "assigned_at")
SELECT manager_assignment."user_id", user_role."id", CURRENT_TIMESTAMP
FROM "user_roles" manager_assignment
JOIN "_manager_roles_to_remove" manager_role
  ON manager_role."id" = manager_assignment."role_id"
JOIN "roles" user_role
  ON user_role."tenant_id" = manager_role."tenant_id"
 AND LOWER(user_role."name") = 'user'
ON CONFLICT ("user_id", "role_id") DO NOTHING;

UPDATE "users"
SET "role" = 'user'
WHERE LOWER(COALESCE("role", '')) = 'manager';

-- A workflow step that explicitly targeted the removed RBAC role keeps its
-- business meaning by resolving the document owner's direct manager.
UPDATE "workflow_steps" step
SET "approver_type" = 'manager',
    "approver_id" = NULL,
    "assignee_type" = 'direct_manager',
    "assignee_user_id" = NULL,
    "assignee_department_id" = NULL,
    "assignee_position_id" = NULL
FROM "workflows" workflow
WHERE workflow."id" = step."workflow_id"
  AND step."approver_type" = 'role'
  AND EXISTS (
    SELECT 1
    FROM "_manager_roles_to_remove" manager_role
    WHERE manager_role."tenant_id" = workflow."tenant_id"
      AND manager_role."id" = step."approver_id"
  );

-- Existing document snapshots must not retain the broad Manager-role grant.
DELETE FROM "document_permissions" permission
USING "documents" document, "_manager_roles_to_remove" manager_role
WHERE document."id" = permission."document_id"
  AND manager_role."tenant_id" = document."tenant_id"
  AND permission."subject_type" = 'role'
  AND permission."subject_id" = manager_role."id";

-- Remove Manager-role ACL templates and legacy role rules from document-type
-- policies. Other hidden ACL templates are preserved byte-for-byte.
UPDATE "tenant_settings" setting
SET "setting_value" = jsonb_set(
  setting."setting_value",
  '{acl_templates}',
  COALESCE(
    (
      SELECT jsonb_agg(template_item)
      FROM jsonb_array_elements(COALESCE(setting."setting_value"->'acl_templates', '[]'::jsonb)) template_item
      WHERE NOT (
        template_item->>'subject_type' = 'specific_role'
        AND COALESCE(template_item->>'subject_id', '') ~ '^[0-9]+$'
        AND EXISTS (
          SELECT 1
          FROM "_manager_roles_to_remove" manager_role
          WHERE manager_role."tenant_id" = setting."tenant_id"
            AND manager_role."id" = (template_item->>'subject_id')::integer
        )
      )
    ),
    '[]'::jsonb
  ),
  TRUE
)
WHERE setting."setting_key" LIKE 'doc_type_policy:%'
  AND jsonb_typeof(setting."setting_value") = 'object'
  AND jsonb_typeof(setting."setting_value"->'acl_templates') = 'array';

UPDATE "tenant_settings" setting
SET "setting_value" = jsonb_set(
  setting."setting_value",
  '{allow_roles}',
  COALESCE(
    (SELECT jsonb_agg(role_name) FROM jsonb_array_elements(setting."setting_value"->'allow_roles') role_name
     WHERE LOWER(TRIM(BOTH '"' FROM role_name::text)) <> 'manager'),
    '[]'::jsonb
  ),
  TRUE
)
WHERE setting."setting_key" LIKE 'doc_type_policy:%'
  AND jsonb_typeof(setting."setting_value") = 'object'
  AND jsonb_typeof(setting."setting_value"->'allow_roles') = 'array';

UPDATE "tenant_settings" setting
SET "setting_value" = jsonb_set(
  setting."setting_value",
  '{deny_roles}',
  COALESCE(
    (SELECT jsonb_agg(role_name) FROM jsonb_array_elements(setting."setting_value"->'deny_roles') role_name
     WHERE LOWER(TRIM(BOTH '"' FROM role_name::text)) <> 'manager'),
    '[]'::jsonb
  ),
  TRUE
)
WHERE setting."setting_key" LIKE 'doc_type_policy:%'
  AND jsonb_typeof(setting."setting_value") = 'object'
  AND jsonb_typeof(setting."setting_value"->'deny_roles') = 'array';

DELETE FROM "roles" role
USING "_manager_roles_to_remove" manager_role
WHERE role."id" = manager_role."id";
