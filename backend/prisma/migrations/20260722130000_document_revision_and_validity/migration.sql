-- A document revision is a distinct lifecycle. Existing documents remain
-- version 1 native documents and retain every historical artifact/run.
ALTER TABLE "documents"
  ADD COLUMN "root_document_id" INTEGER,
  ADD COLUMN "supersedes_document_id" INTEGER,
  ADD COLUMN "revision_no" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "source_kind" TEXT NOT NULL DEFAULT 'native',
  ADD COLUMN "external_signature_status" TEXT;

CREATE INDEX "documents_tenant_id_root_document_id_revision_no_idx"
  ON "documents"("tenant_id", "root_document_id", "revision_no");
CREATE INDEX "documents_tenant_id_expiration_date_idx"
  ON "documents"("tenant_id", "expiration_date");

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_root_document_id_fkey"
  FOREIGN KEY ("root_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_supersedes_document_id_fkey"
  FOREIGN KEY ("supersedes_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
