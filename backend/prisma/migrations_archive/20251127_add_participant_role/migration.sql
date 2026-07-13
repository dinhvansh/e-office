-- Add participant_role field to workflow_steps table
-- This field distinguishes between approver steps and signer steps

ALTER TABLE workflow_steps 
ADD COLUMN participant_role VARCHAR(50);

-- Set default value for existing rows
-- Assume all existing steps are approver steps
UPDATE workflow_steps 
SET participant_role = 'approver' 
WHERE participant_role IS NULL;

-- Add comment
COMMENT ON COLUMN workflow_steps.participant_role IS 'Role of participant in this step: approver or signer';
