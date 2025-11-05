-- =============================================
-- FIX: Row Level Security Policies for Checklist Submission
-- Date: 2025-11-05
-- Issue: Users unable to submit checklists due to RLS policy violations
-- =============================================

-- The `checklists`, `checklist_items`, and `equipment` tables are template/reference
-- tables that contain the checklist definitions. These should be readable by all
-- authenticated users but NOT modifiable by regular users.

-- For these template tables, we have two options:
-- Option A: Disable RLS (since they're not user-specific data)
-- Option B: Keep RLS but make policies very permissive for SELECT

-- We'll use Option B to maintain security while allowing proper access

-- ============= CHECKLISTS TABLE =============
-- Ensure authenticated users can view all checklists (templates)
-- This is necessary for foreign key validation when inserting completed_checklists

DROP POLICY IF EXISTS "Authenticated users can view checklists" ON public.checklists;

CREATE POLICY "Authenticated users can view checklists"
  ON public.checklists
  FOR SELECT
  TO authenticated
  USING (true);

-- Add policies for system operations (if needed in the future)
-- Regular users should NOT be able to modify templates
CREATE POLICY "Service role can manage checklists"
  ON public.checklists
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============= CHECKLIST_ITEMS TABLE =============
-- Ensure authenticated users can view all checklist items

DROP POLICY IF EXISTS "Authenticated users can view checklist items" ON public.checklist_items;

CREATE POLICY "Authenticated users can view checklist items"
  ON public.checklist_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage checklist items"
  ON public.checklist_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============= EQUIPMENT TABLE =============
-- Ensure authenticated users can view all equipment

DROP POLICY IF EXISTS "Authenticated users can view equipment" ON public.equipment;

CREATE POLICY "Authenticated users can view equipment"
  ON public.equipment
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage equipment"
  ON public.equipment
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============= COMPLETED_CHECKLISTS TABLE =============
-- Fix the INSERT and SELECT policies to work correctly together

DROP POLICY IF EXISTS "Users can insert own completed checklists" ON public.completed_checklists;
DROP POLICY IF EXISTS "Users can view own completed checklists" ON public.completed_checklists;

-- Users can view their own completed checklists
CREATE POLICY "Users can view own completed checklists"
  ON public.completed_checklists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own completed checklists
CREATE POLICY "Users can insert own completed checklists"
  ON public.completed_checklists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own completed checklists (for corrections within a time window)
CREATE POLICY "Users can update own completed checklists"
  ON public.completed_checklists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role can manage completed checklists"
  ON public.completed_checklists
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============= COMPLETED_ITEMS TABLE =============
-- Fix policies for inserting completed items

DROP POLICY IF EXISTS "Users can view own completed items" ON public.completed_items;
DROP POLICY IF EXISTS "Users can insert completed items" ON public.completed_items;

-- Users can view items from their own completed checklists
CREATE POLICY "Users can view own completed items"
  ON public.completed_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.completed_checklists
      WHERE completed_checklists.id = completed_items.completed_checklist_id
        AND completed_checklists.user_id = auth.uid()
    )
  );

-- Users can insert items for their own completed checklists
-- IMPORTANT: This policy uses a subquery that needs SELECT access to completed_checklists
CREATE POLICY "Users can insert completed items"
  ON public.completed_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.completed_checklists
      WHERE completed_checklists.id = completed_items.completed_checklist_id
        AND completed_checklists.user_id = auth.uid()
    )
  );

-- Users can update items for their own completed checklists
CREATE POLICY "Users can update own completed items"
  ON public.completed_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.completed_checklists
      WHERE completed_checklists.id = completed_items.completed_checklist_id
        AND completed_checklists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.completed_checklists
      WHERE completed_checklists.id = completed_items.completed_checklist_id
        AND completed_checklists.user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role can manage completed items"
  ON public.completed_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============= ISSUES TABLE =============
-- Ensure policies exist for issue creation

DROP POLICY IF EXISTS "Users can view own issues" ON public.issues;
DROP POLICY IF EXISTS "Users can create issues" ON public.issues;
DROP POLICY IF EXISTS "Users can update own issues" ON public.issues;

-- Users can view issues they reported
CREATE POLICY "Users can view own issues"
  ON public.issues
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reported_by);

-- Users can create issues
CREATE POLICY "Users can create issues"
  ON public.issues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- Users can update issues they reported
CREATE POLICY "Users can update own issues"
  ON public.issues
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = reported_by)
  WITH CHECK (auth.uid() = reported_by);

-- Service role has full access
CREATE POLICY "Service role can manage issues"
  ON public.issues
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============= PHOTOS TABLE =============
-- Ensure policies for photo uploads

DROP POLICY IF EXISTS "Users can view own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can insert photos" ON public.photos;

-- Users can view photos from their own inspections
CREATE POLICY "Users can view own photos"
  ON public.photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.completed_items ci
      JOIN public.completed_checklists cc ON ci.completed_checklist_id = cc.id
      WHERE ci.id = photos.completed_item_id
        AND cc.user_id = auth.uid()
    )
  );

-- Users can insert photos for their own inspections
CREATE POLICY "Users can insert photos"
  ON public.photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.completed_items ci
      JOIN public.completed_checklists cc ON ci.completed_checklist_id = cc.id
      WHERE ci.id = photos.completed_item_id
        AND cc.user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role can manage photos"
  ON public.photos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============= REPORTS TABLE =============
-- Ensure policies for report generation

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;

-- Users can view reports they generated
CREATE POLICY "Users can view own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = generated_by);

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = generated_by);

-- Service role has full access
CREATE POLICY "Service role can manage reports"
  ON public.reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============= VERIFICATION =============
-- Create a helper function to verify RLS policies are working

CREATE OR REPLACE FUNCTION public.verify_rls_policies()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  policy_command TEXT,
  policy_role TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    schemaname || '.' || tablename AS table_name,
    policyname AS policy_name,
    cmd AS policy_command,
    roles::TEXT AS policy_role
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('checklists', 'checklist_items', 'equipment',
                      'completed_checklists', 'completed_items',
                      'issues', 'photos', 'reports')
  ORDER BY tablename, policyname;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_rls_policies() TO authenticated;

COMMENT ON FUNCTION public.verify_rls_policies() IS 'Helper function to view all RLS policies for checklist-related tables';
