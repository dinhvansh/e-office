-- Add department_id to documents table for department-based visibility
ALTER TABLE "documents" ADD COLUMN "department_id" INTEGER;

-- Add foreign key constraint
ALTER TABLE "documents" ADD CONSTRAINT "documents_department_id_fkey" 
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX "documents_department_id_idx" ON "documents"("department_id");
