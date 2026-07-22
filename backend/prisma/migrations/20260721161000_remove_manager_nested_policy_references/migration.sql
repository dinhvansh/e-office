-- Some API clients used the normalized nested policy shape. Remove the retired
-- Manager role name there as well while preserving every other rule.
UPDATE "tenant_settings" setting
SET "setting_value" = jsonb_set(
  setting."setting_value",
  '{legacy_rules,allow_roles}',
  COALESCE(
    (SELECT jsonb_agg(role_name) FROM jsonb_array_elements(setting."setting_value"->'legacy_rules'->'allow_roles') role_name
     WHERE LOWER(TRIM(BOTH '"' FROM role_name::text)) <> 'manager'),
    '[]'::jsonb
  ),
  TRUE
)
WHERE setting."setting_key" LIKE 'doc_type_policy:%'
  AND jsonb_typeof(setting."setting_value"->'legacy_rules'->'allow_roles') = 'array';

UPDATE "tenant_settings" setting
SET "setting_value" = jsonb_set(
  setting."setting_value",
  '{legacy_rules,deny_roles}',
  COALESCE(
    (SELECT jsonb_agg(role_name) FROM jsonb_array_elements(setting."setting_value"->'legacy_rules'->'deny_roles') role_name
     WHERE LOWER(TRIM(BOTH '"' FROM role_name::text)) <> 'manager'),
    '[]'::jsonb
  ),
  TRUE
)
WHERE setting."setting_key" LIKE 'doc_type_policy:%'
  AND jsonb_typeof(setting."setting_value"->'legacy_rules'->'deny_roles') = 'array';
