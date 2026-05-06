-- FIX: Add missing column to cycles table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.cycles 
ADD COLUMN IF NOT EXISTS approval_end_date DATE;

-- Optional: If your app also expects these, it's good to have them
ALTER TABLE public.cycles 
ADD COLUMN IF NOT EXISTS self_review_end_date DATE,
ADD COLUMN IF NOT EXISTS manager_eval_end_date DATE;
