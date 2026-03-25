-- ==========================================================
-- ADD TARGET DESIGNATIONS TO QUESTION SETS
-- Run this in your Supabase SQL Editor
-- ==========================================================

-- 1. Add target_designations array (stores names of job titles)
ALTER TABLE public.question_sets
ADD COLUMN IF NOT EXISTS target_designations JSONB DEFAULT '[]'::jsonb;

-- 2. Optional: Remove question_set_id from profiles since we don't need direct links
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS question_set_id;
