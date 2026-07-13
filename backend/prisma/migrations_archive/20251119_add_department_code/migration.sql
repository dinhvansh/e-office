-- Add code field to departments table
ALTER TABLE "departments" ADD COLUMN "code" VARCHAR(50);

-- Add unique constraint for code within tenant
CREATE UNIQUE INDEX "departments_tenant_id_code_key" ON "departments"("tenant_id", "code") WHERE "code" IS NOT NULL;
