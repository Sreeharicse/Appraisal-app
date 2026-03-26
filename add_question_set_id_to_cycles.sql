-- ==========================================================
-- ADD QUESTION SET ID TO CYCLES
-- Run this in your Supabase SQL Editor
-- ==========================================================

-- Add the question_set_id column to the cycles table
-- It references the question_sets table but is nullable (so it can fall back to designation)
ALTER TABLE public.cycles
ADD COLUMN IF NOT EXISTS question_set_id UUID REFERENCES public.question_sets(id) ON DELETE SET NULL;
