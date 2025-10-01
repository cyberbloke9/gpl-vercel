-- Add unique constraint to prevent duplicate checklist completions per session per day
-- We use a simpler approach without DATE function
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_session_checklist 
ON completed_checklists(user_id, checklist_id, session_number)
WHERE session_number IS NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_completed_checklists_user_session 
ON completed_checklists(user_id, session_number, completed_at DESC);