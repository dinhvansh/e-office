ALTER TABLE "document_attachments"
  ADD COLUMN "attachment_kind" TEXT NOT NULL DEFAULT 'SUPPLEMENTAL',
  ADD COLUMN "uploaded_by" INTEGER,
  ADD COLUMN "comment_id" INTEGER;

ALTER TABLE "document_attachments"
  ADD CONSTRAINT "document_attachments_uploaded_by_fkey"
  FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_attachments"
  ADD CONSTRAINT "document_attachments_comment_id_fkey"
  FOREIGN KEY ("comment_id") REFERENCES "sign_request_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "document_attachments_comment_id_idx" ON "document_attachments"("comment_id");
