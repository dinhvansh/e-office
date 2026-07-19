-- Preserve each execution of a document workflow. Existing instances and
-- approvals become run 1; resubmission creates run 2+ instead of deleting it.
ALTER TABLE "workflow_instances" ADD COLUMN "run_number" INTEGER NOT NULL DEFAULT 1;
DROP INDEX IF EXISTS "workflow_instances_document_id_key";
CREATE UNIQUE INDEX "workflow_instances_document_id_run_number_key" ON "workflow_instances"("document_id", "run_number");
CREATE INDEX "workflow_instances_document_id_status_idx" ON "workflow_instances"("document_id", "status");

ALTER TABLE "document_approvals" ADD COLUMN "workflow_instance_id" INTEGER;
UPDATE "document_approvals" AS approval SET "workflow_instance_id" = instance."id"
FROM "workflow_instances" AS instance
WHERE instance."document_id" = approval."document_id" AND instance."workflow_id" = approval."workflow_id";
ALTER TABLE "document_approvals" ALTER COLUMN "workflow_instance_id" SET NOT NULL;
CREATE INDEX "document_approvals_workflow_instance_id_idx" ON "document_approvals"("workflow_instance_id");
ALTER TABLE "document_approvals" ADD CONSTRAINT "document_approvals_workflow_instance_id_fkey"
FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
