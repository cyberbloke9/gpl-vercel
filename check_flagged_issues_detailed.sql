-- Comprehensive flagged_issues debugging script

-- 1. Check if table exists and has data
SELECT 'Total flagged_issues count:' as check_name, COUNT(*)::text as result
FROM public.flagged_issues;

-- 2. Check RLS is enabled
SELECT 'RLS enabled:' as check_name,
       CASE WHEN rowsecurity THEN 'YES' ELSE 'NO' END as result
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'flagged_issues';

-- 3. List all RLS policies
SELECT 'All RLS Policies:' as check_name,
       policyname as result
FROM pg_policies
WHERE tablename = 'flagged_issues';

-- 4. Check each policy in detail
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'flagged_issues'
ORDER BY policyname;

-- 5. Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name='flagged_issues';

-- 6. Sample data (first 5 issues)
SELECT
  id,
  user_id,
  module,
  section,
  severity,
  status,
  TO_CHAR(reported_at, 'YYYY-MM-DD HH24:MI:SS') as reported_at,
  issue_code
FROM public.flagged_issues
ORDER BY reported_at DESC
LIMIT 5;

-- 7. Check if user_id values exist in profiles
SELECT
  'Issues with invalid user_id:' as check_name,
  COUNT(*)::text as result
FROM public.flagged_issues fi
LEFT JOIN public.profiles p ON fi.user_id = p.id
WHERE p.id IS NULL;

-- 8. Check if user_id values match auth.users
SELECT
  'Issues with user_id not in auth.users:' as check_name,
  COUNT(*)::text as result
FROM public.flagged_issues fi
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE id = fi.user_id
);

-- 9. Test SELECT with RLS (this should work if policies are correct)
-- Note: This will use the current user's context
SELECT
  id,
  user_id,
  module,
  severity,
  status,
  reported_at
FROM public.flagged_issues
WHERE reported_at >= NOW() - INTERVAL '7 days'
ORDER BY reported_at DESC
LIMIT 10;

-- 10. Check user_roles table for admin users
SELECT
  'Admin users count:' as check_name,
  COUNT(*)::text as result
FROM public.user_roles
WHERE role = 'admin';
