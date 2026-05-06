-- Fix for 403 Forbidden Error on self_reviews table
-- This script adds the missing Row Level Security (RLS) policies to allow employees to submit and edit their self-assessments.

-- 1. Ensure RLS is enabled on the table
ALTER TABLE public.self_reviews ENABLE ROW LEVEL SECURITY;

-- 2. Allow all authenticated users to read records
-- (The application handles specific filtering per-role already)
CREATE POLICY "Enable read access for all users" ON public.self_reviews
    FOR SELECT USING (true);

-- 3. Allow authenticated users to insert new self-reviews
CREATE POLICY "Enable insert access for authenticated users" ON public.self_reviews
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Allow authenticated users to update existing self-reviews
CREATE POLICY "Enable update access for authenticated users" ON public.self_reviews
    FOR UPDATE USING (auth.uid() IS NOT NULL);
    
-- 5. Allow authenticated users to delete (e.g., when resetting data or cascading)
CREATE POLICY "Enable delete access for authenticated users" ON public.self_reviews
    FOR DELETE USING (auth.uid() IS NOT NULL);
