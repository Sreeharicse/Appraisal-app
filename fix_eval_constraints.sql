-- FIX: Make legacy rating columns nullable
-- Run this in your Supabase SQL Editor to prevent "not-null constraint" errors
-- Corrected Syntax for PostgreSQL/Supabase

ALTER TABLE evaluations 
    ALTER COLUMN work_performance_rating DROP NOT NULL,
    ALTER COLUMN behavioral_rating DROP NOT NULL,
    ALTER COLUMN hr_rating DROP NOT NULL;
