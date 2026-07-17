ALTER TABLE "positions"
  ADD COLUMN IF NOT EXISTS "can_manage_department" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "department_support_managers" (
  "id" SERIAL NOT NULL,
  "department_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "department_support_managers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "department_support_managers_department_id_user_id_key"
  ON "department_support_managers"("department_id", "user_id");
CREATE INDEX IF NOT EXISTS "department_support_managers_user_id_idx"
  ON "department_support_managers"("user_id");

ALTER TABLE "department_support_managers"
  ADD CONSTRAINT "department_support_managers_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_support_managers"
  ADD CONSTRAINT "department_support_managers_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
