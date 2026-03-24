-- ============================================================
-- FIX: Enable SELECT for all roles on the cycles table
-- Run this in your Supabase SQL Editor if employees cannot see cycles
-- ============================================================

-- Drop existing select policy if it's too restrictive
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cycles;
DROP POLICY IF EXISTS "Allow select for all" ON public.cycles;

-- Create a new policy that allows anyone with a valid session to see cycles
CREATE POLICY "Enable select for all authenticated users"
ON public.cycles
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
