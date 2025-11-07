-- Check existing RLS policies
SELECT * FROM pg_policies WHERE tablename = 'flagged_issues';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own flagged issues" ON public.flagged_issues;
DROP POLICY IF EXISTS "Users can insert their own flagged issues" ON public.flagged_issues;
DROP POLICY IF EXISTS "Admins can view all flagged issues" ON public.flagged_issues;
DROP POLICY IF EXISTS "Admins can update flagged issues" ON public.flagged_issues;

-- Enable RLS
ALTER TABLE public.flagged_issues ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own flagged issues
CREATE POLICY "Users can view their own flagged issues"
ON public.flagged_issues
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy: Users can insert their own flagged issues
CREATE POLICY "Users can insert their own flagged issues"
ON public.flagged_issues
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Admins can view all flagged issues
CREATE POLICY "Admins can view all flagged issues"
ON public.flagged_issues
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy: Admins can update all flagged issues
CREATE POLICY "Admins can update all flagged issues"
ON public.flagged_issues
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'flagged_issues';
