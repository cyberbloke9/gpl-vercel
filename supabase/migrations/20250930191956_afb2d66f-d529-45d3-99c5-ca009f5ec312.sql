-- Drop existing permissive SELECT policies that allow viewing all records
DROP POLICY IF EXISTS "Users can view all completed checklists" ON completed_checklists;
DROP POLICY IF EXISTS "Users can view completed items" ON completed_items;
DROP POLICY IF EXISTS "Users can view all issues" ON issues;
DROP POLICY IF EXISTS "Users can view all reports" ON reports;
DROP POLICY IF EXISTS "Users can view photos" ON photos;

-- Create restrictive SELECT policies - users can only view their own data

-- Completed checklists: users can only view their own inspection records
CREATE POLICY "Users can view own completed checklists"
ON completed_checklists
FOR SELECT
USING (auth.uid() = user_id);

-- Completed items: users can only view items from their own inspection checklists
CREATE POLICY "Users can view own completed items"
ON completed_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM completed_checklists
    WHERE completed_checklists.id = completed_items.completed_checklist_id
    AND completed_checklists.user_id = auth.uid()
  )
);

-- Issues: users can only view issues they reported themselves
CREATE POLICY "Users can view own issues"
ON issues
FOR SELECT
USING (auth.uid() = reported_by);

-- Reports: users can only view reports they generated themselves
CREATE POLICY "Users can view own reports"
ON reports
FOR SELECT
USING (auth.uid() = generated_by);

-- Photos: users can only view photos from their own inspections
CREATE POLICY "Users can view own photos"
ON photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM completed_items ci
    JOIN completed_checklists cc ON ci.completed_checklist_id = cc.id
    WHERE ci.id = photos.completed_item_id
    AND cc.user_id = auth.uid()
  )
);