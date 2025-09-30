-- SECURITY FIX: Restrict profile viewing to self-only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new restrictive policy: users can only view their own profile
CREATE POLICY "Users can view own profile only"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Add denormalized name fields for audit trail
-- This allows showing who performed actions without exposing all profiles
ALTER TABLE public.completed_checklists
ADD COLUMN IF NOT EXISTS completed_by_name TEXT;

ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS reported_by_name TEXT;

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS generated_by_name TEXT;

-- Create a helper function to get current user's full name (security definer)
CREATE OR REPLACE FUNCTION public.get_current_user_name()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid();
$$;

-- Update the trigger for new user creation to ensure it still works
-- (no changes needed, just verifying it's secure)