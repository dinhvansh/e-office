-- Additive metadata for asynchronously generated signed-PDF artifacts.
-- Existing documents remain valid; the column is populated only after an
-- artifact has been generated, read back, and hashed by the worker.
ALTER TABLE "documents" ADD COLUMN "artifact_metadata" JSONB;
