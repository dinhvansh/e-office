ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "revision_comment" TEXT;
