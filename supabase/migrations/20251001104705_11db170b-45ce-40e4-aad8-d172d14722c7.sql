-- Add emergency checklist columns to completed_checklists
ALTER TABLE completed_checklists 
ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS emergency_reason TEXT,
ADD COLUMN IF NOT EXISTS emergency_reported_at TIMESTAMP WITH TIME ZONE;

-- Add index for emergency queries
CREATE INDEX IF NOT EXISTS idx_completed_checklists_emergency 
ON completed_checklists(is_emergency, emergency_reported_at) 
WHERE is_emergency = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN completed_checklists.is_emergency IS 'Indicates if this checklist was completed as an emergency outside normal time slots';
COMMENT ON COLUMN completed_checklists.emergency_reason IS 'Reason for emergency checklist completion';
COMMENT ON COLUMN completed_checklists.emergency_reported_at IS 'Timestamp when emergency was reported';