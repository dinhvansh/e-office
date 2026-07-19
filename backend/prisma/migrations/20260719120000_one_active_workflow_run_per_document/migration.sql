-- A document may retain any number of historical workflow runs, but at most
-- one run may remain actionable. Preserve every duplicate row and close only
-- older in-progress runs before installing the database invariant.
WITH ranked_active_runs AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "document_id"
      ORDER BY "run_number" DESC, "started_at" DESC, "id" DESC
    ) AS active_rank
  FROM "workflow_instances"
  WHERE "status" = 'in_progress'
)
UPDATE "workflow_instances" AS instance
SET
  "status" = 'superseded',
  "completed_at" = COALESCE(instance."completed_at", CURRENT_TIMESTAMP),
  "current_step_id" = NULL
FROM ranked_active_runs AS ranked
WHERE instance."id" = ranked."id" AND ranked.active_rank > 1;

CREATE UNIQUE INDEX "workflow_instances_one_active_per_document_idx"
ON "workflow_instances" ("document_id")
WHERE "status" = 'in_progress';
