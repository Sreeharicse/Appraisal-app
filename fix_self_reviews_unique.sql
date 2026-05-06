-- ============================================================
-- FIX 1: Allow authenticated users to insert their own profile row.
-- This is needed when an imported employee's profile UUID (assigned by HR)
-- doesn't match their Supabase Auth UID. The app tries to insert a new profile
-- row with the Auth UID — this policy permits that.
-- ============================================================
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================================
-- FIX 2: Also allow authenticated users to update their OWN profile.
-- The existing update policy only covers auth.uid() = id OR admin/hr,
-- but a newly linked profile may not satisfy that until after the insert.
-- ============================================================
CREATE POLICY "Users can update own profile by email"
ON public.profiles
FOR UPDATE
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- ============================================================
-- FIX 3: Remove duplicate self_reviews rows, then add unique constraint.
-- ============================================================

-- Step 1: Delete older duplicates (keep most recent per employee+cycle)
DELETE FROM public.self_reviews
WHERE id NOT IN (
    SELECT DISTINCT ON (employee_id, cycle_id) id
    FROM public.self_reviews
    ORDER BY employee_id, cycle_id, submitted_at DESC NULLS LAST
);

-- Step 2: Add unique constraint
ALTER TABLE public.self_reviews
    DROP CONSTRAINT IF EXISTS self_reviews_employee_cycle_unique;

ALTER TABLE public.self_reviews
    ADD CONSTRAINT self_reviews_employee_cycle_unique
    UNIQUE (employee_id, cycle_id);
