# RLS Policy Fix - Checklist Submission Error

## Problem Summary

**Error Message:** `Failed to submit: New row violates row-level security policy for table "checklists"`

**Root Cause:** The Row Level Security (RLS) policies on your Supabase database tables were incomplete or incorrectly configured, preventing users from submitting checklists even though they had proper authentication.

## Technical Analysis

### What Was Wrong

1. **Missing Policy Scope**: The original policies used `USING (auth.uid() IS NOT NULL)` without specifying `TO authenticated`, which can cause issues with Supabase's RLS enforcement.

2. **Incomplete Policy Coverage**: Several tables had SELECT policies but were missing INSERT, UPDATE policies needed for the application to function.

3. **Policy Role Specification**: Policies need to explicitly specify `TO authenticated` or `TO public` to work correctly with Supabase's authentication system.

4. **Foreign Key Validation**: When inserting into `completed_checklists` with a foreign key to `checklists`, Postgres uses RLS policies to validate the reference. If the policies aren't properly scoped, this validation can fail.

### Tables Affected

- **Template Tables** (read-only for users):
  - `checklists`
  - `checklist_items`
  - `equipment`

- **User Data Tables** (read/write for users):
  - `completed_checklists`
  - `completed_items`
  - `issues`
  - `photos`
  - `reports`

## The Fix

The migration file `20251105000000_fix_rls_policies.sql` does the following:

### 1. Template Tables (checklists, checklist_items, equipment)
- ✅ Allows all **authenticated** users to SELECT (read) all records
- ✅ Prevents regular users from modifying templates
- ✅ Allows **service_role** full access for admin operations

### 2. User Data Tables (completed_checklists, completed_items, issues, photos, reports)
- ✅ Users can SELECT only their own records
- ✅ Users can INSERT their own records
- ✅ Users can UPDATE their own records
- ✅ All policies explicitly specify `TO authenticated`
- ✅ Service role has full access

### 3. Policy Improvements
- Used `TO authenticated` instead of relying on `auth.uid() IS NOT NULL`
- Added UPDATE policies (previously missing)
- Added service_role policies for admin operations
- Ensured all subqueries in policies have proper access

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Migrations**
3. Click **New Migration**
4. Copy the contents of `supabase/migrations/20251105000000_fix_rls_policies.sql`
5. Paste into the SQL editor
6. Click **Run** to apply the migration

### Option 2: Using Supabase CLI

```bash
cd gayatripower

# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

### Option 3: Manual SQL Execution

1. Go to **SQL Editor** in Supabase dashboard
2. Copy and paste the entire contents of `20251105000000_fix_rls_policies.sql`
3. Click **Run** or press `Ctrl+Enter`

## Verification

After applying the fix, you can verify the policies are correct:

### 1. Check Policies Using Helper Function

```sql
SELECT * FROM public.verify_rls_policies();
```

This will show all RLS policies for your checklist-related tables.

### 2. Test Checklist Submission

1. Log into your application
2. Scan a QR code to unlock a category
3. Complete the checklist items
4. Submit the checklist
5. Verify it submits successfully without RLS errors

### 3. Check Supabase Logs

If issues persist:
1. Go to **Logs** → **Postgres Logs** in Supabase dashboard
2. Look for RLS policy violations
3. Check which specific policy is failing

## Expected Behavior After Fix

✅ Users can scan QR codes and load checklists
✅ Users can submit completed checklists
✅ Users can view their own completed checklists
✅ Users can create issues for failed items
✅ Users can upload photos
✅ Users can generate reports
✅ Users cannot see other users' completed checklists
✅ Users cannot modify checklist templates

## Additional Issues Found (Not Fixed by This Migration)

While fixing the RLS policies, I identified other bugs in your codebase:

1. **TypeScript Strict Mode Disabled** - Type safety is turned off in `tsconfig.json`
2. **Schema Mismatch** - Two different database schemas coexist (old and new)
3. **Hardcoded QR Codes** - Equipment QR codes are hardcoded in frontend
4. **Missing Equipment Data** - Database may have incomplete equipment records
5. **Equipment Category Matching Bug** - Uses fuzzy `ilike` instead of exact matching

These issues should be addressed separately. Would you like me to fix any of these next?

## Troubleshooting

### If the error persists after applying the migration:

**1. Check Authentication**
```javascript
// In browser console on your app
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

**2. Check Table Permissions**
```sql
-- Run in Supabase SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('checklists', 'completed_checklists', 'completed_items');
```

**3. Test Policy Directly**
```sql
-- Run as your authenticated user
SET request.jwt.claims = '{"sub": "YOUR_USER_ID"}';
SELECT * FROM checklists LIMIT 1;
```

**4. Check for Conflicts**
```sql
-- Check if there are duplicate policies
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 10;
```

## Rollback (If Needed)

If something goes wrong, you can rollback by dropping the new policies:

```sql
-- WARNING: This will remove all policies added by the fix
-- Only use if you need to rollback

DROP POLICY IF EXISTS "Authenticated users can view checklists" ON public.checklists;
DROP POLICY IF EXISTS "Service role can manage checklists" ON public.checklists;
-- ... (continue for all policies in the migration)
```

Then re-apply the original policies from the earlier migrations.

## Support

If you continue to have issues after applying this fix:

1. Check the Supabase Postgres logs for specific error details
2. Verify your Supabase project's auth settings
3. Ensure you're using the latest Supabase client library
4. Check that your `.env` file has the correct Supabase URL and anon key

## Next Steps

After confirming this fix works:

1. **Add Tests** - Currently no tests exist for RLS policies
2. **Fix TypeScript** - Enable strict mode and fix type errors
3. **Resolve Schema Mismatch** - Complete the migration to new schema or remove it
4. **Dynamic Equipment** - Replace hardcoded QR codes with database-driven approach
5. **Add Error Boundaries** - Improve error handling in React components

---

**Created:** November 5, 2025
**Migration File:** `20251105000000_fix_rls_policies.sql`
**Tested:** ⚠️ Requires testing after deployment
