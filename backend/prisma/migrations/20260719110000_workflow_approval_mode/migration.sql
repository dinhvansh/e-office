-- Existing workflows retain the historical sequential behavior.
ALTER TABLE "workflows"
ADD COLUMN "approval_mode" TEXT NOT NULL DEFAULT 'sequential';

ALTER TABLE "workflows"
ADD CONSTRAINT "workflows_approval_mode_check"
CHECK ("approval_mode" IN ('sequential', 'parallel'));
