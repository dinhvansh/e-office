ALTER TABLE "refresh_sessions" ADD COLUMN "family_id" TEXT;

-- Existing sessions predate families. Treat each legacy session as its own
-- family so a reuse event still revokes that session safely.
UPDATE "refresh_sessions" SET "family_id" = "id" WHERE "family_id" IS NULL;

CREATE INDEX "refresh_sessions_family_id_revoked_at_idx"
  ON "refresh_sessions"("family_id", "revoked_at");
