ALTER TABLE "documents" ADD COLUMN "archived_at" TIMESTAMP(3), ADD COLUMN "archived_by" INTEGER, ADD COLUMN "archive_reason" TEXT, ADD COLUMN "previous_status" TEXT;
ALTER TABLE "sign_requests" ADD COLUMN "archived_at" TIMESTAMP(3), ADD COLUMN "archived_by" INTEGER, ADD COLUMN "archive_reason" TEXT, ADD COLUMN "previous_status" TEXT;
CREATE INDEX "documents_tenant_id_archived_at_idx" ON "documents"("tenant_id", "archived_at");
CREATE INDEX "sign_requests_tenant_id_archived_at_idx" ON "sign_requests"("tenant_id", "archived_at");
INSERT INTO "permissions" ("resource", "action", "description") VALUES
  ('archive', 'view', 'View archived documents and requests'),
  ('archive', 'restore', 'Restore archived documents and requests'),
  ('archive', 'delete_permanently', 'Permanently delete archived records')
ON CONFLICT ("resource", "action") DO UPDATE SET "description" = EXCLUDED."description";
-- Existing tenant Admin roles receive archive view/restore, never permanent delete.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'Admin' AND p."resource" = 'archive' AND p."action" IN ('view', 'restore')
ON CONFLICT DO NOTHING;
