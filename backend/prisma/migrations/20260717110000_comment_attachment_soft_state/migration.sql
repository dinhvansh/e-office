ALTER TABLE "sign_request_comments"
  ADD COLUMN "edited_at" TIMESTAMP(3),
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "deleted_by" INTEGER;

ALTER TABLE "document_attachments"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "withdrawn_by" INTEGER,
  ADD COLUMN "withdrawn_at" TIMESTAMP(3),
  ADD COLUMN "withdraw_reason" TEXT;

CREATE INDEX "document_attachments_status_idx" ON "document_attachments"("status");
