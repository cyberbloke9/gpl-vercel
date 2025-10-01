-- Add session tracking to completed_checklists for time-based unlocking
ALTER TABLE completed_checklists 
ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS time_slot TEXT;

-- Add comment for clarity
COMMENT ON COLUMN completed_checklists.session_number IS 'Daily session number (1-4) corresponding to time slots: 8AM, 12PM, 5:30PM, 11:45PM';
COMMENT ON COLUMN completed_checklists.time_slot IS 'Time slot when checklist was completed (e.g., 08:00, 12:00, 17:30, 23:45)';

-- Clean all existing junk data from reports table
DELETE FROM reports;

-- Clean old completed checklists data to start fresh
DELETE FROM completed_checklists;

-- Clean old completed items data
DELETE FROM completed_items;

-- Clean old issues data
DELETE FROM issues;

-- Add index for efficient session tracking queries
CREATE INDEX IF NOT EXISTS idx_completed_checklists_session 
ON completed_checklists(user_id, completed_at, session_number);

-- Add index for time-based queries
CREATE INDEX IF NOT EXISTS idx_completed_checklists_time_slot 
ON completed_checklists(user_id, time_slot, completed_at);