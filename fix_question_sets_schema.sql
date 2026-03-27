-- ==========================================================
-- FIX MISSING COLUMNS IN QUESTION SETS
-- Run this in your Supabase SQL Editor
-- ==========================================================

ALTER TABLE IF EXISTS public.question_sets
    ADD COLUMN IF NOT EXISTS target_designations JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT false;

-- Ensure RLS policies are up to date if you've had issues
-- DROP POLICY IF EXISTS "question_sets_update" ON public.question_sets;
-- CREATE POLICY "question_sets_update" ON public.question_sets
--     FOR UPDATE TO authenticated
--     USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')));
