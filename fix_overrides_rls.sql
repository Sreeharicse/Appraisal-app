-- Fix Row Level Security (RLS) for Employee Question Set Overrides

-- Since employees need to read their assigned question sets to render the Self Review properly, 
-- we must allow the 'authenticated' role to select from this table.

-- Drop any potentially conflicting restrictive policies if they exist
DROP POLICY IF EXISTS "Allow authenticated view" ON public.employee_cycle_question_set;
DROP POLICY IF EXISTS "Allow employees to view their own question sets" ON public.employee_cycle_question_set;
DROP POLICY IF EXISTS "Allow all authenticated users to read employee question sets" ON public.employee_cycle_question_set;

-- Create a permissive SELECT policy
CREATE POLICY "Allow all authenticated users to read employee question sets"
ON public.employee_cycle_question_set
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled on the table
ALTER TABLE public.employee_cycle_question_set ENABLE ROW LEVEL SECURITY;
