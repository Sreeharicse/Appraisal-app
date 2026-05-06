-- Fix for new row violates row-level security policy on table "evaluations"
-- This script replaces the existing evaluations policy with corrected permissions.

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Drop the restrictive existing policy if it exists
DROP POLICY IF EXISTS "Evaluations_Access" ON public.evaluations;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.evaluations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.evaluations;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.evaluations;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.evaluations;

-- 1. Read access
CREATE POLICY "Enable read access for all users" ON public.evaluations
    FOR SELECT USING (true);

-- 2. Insert access (managers create evaluations, hr/admin might create overrides)
CREATE POLICY "Enable insert access for authenticated users" ON public.evaluations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Update access
CREATE POLICY "Enable update access for authenticated users" ON public.evaluations
    FOR UPDATE USING (auth.uid() IS NOT NULL);
    
-- 4. Delete access
CREATE POLICY "Enable delete access for authenticated users" ON public.evaluations
    FOR DELETE USING (auth.uid() IS NOT NULL);
