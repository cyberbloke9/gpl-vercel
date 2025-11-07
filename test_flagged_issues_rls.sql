-- Test if flagged issues are visible with current RLS policies

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'flagged_issues';

-- 2. Check all policies
SELECT *
FROM pg_policies
WHERE tablename = 'flagged_issues';

-- 3. Check actual data in flagged_issues (as admin)
SELECT
    id,
    issue_code,
    user_id,
    module,
    section,
    item,
    severity,
    status,
    created_at,
    reported_at
FROM public.flagged_issues
ORDER BY reported_at DESC
LIMIT 10;

-- 4. Test if profiles foreign key exists
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

-- 5. Test query that frontend uses (without RLS context)
-- This simulates what the frontend query does
SELECT
    fi.*,
    p.full_name,
    p.employee_id
FROM public.flagged_issues fi
LEFT JOIN public.profiles p ON fi.user_id = p.id
WHERE fi.reported_at >= NOW() - INTERVAL '7 days'
ORDER BY fi.reported_at DESC;
