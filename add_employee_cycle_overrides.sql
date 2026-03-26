-- ==========================================================
-- CREATE EMPLOYEE CYCLE OVERRIDES TABLE
-- Run this in your Supabase SQL Editor
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.employee_cycle_overrides (
    employee_id UUID REFERENCES public.profiles(id) on DELETE CASCADE,
    cycle_id UUID REFERENCES public.cycles(id) on DELETE CASCADE,
    question_set_id UUID REFERENCES public.question_sets(id) on DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (employee_id, cycle_id)
);

-- Note: In a production environment with RLS, you would also need:
-- ALTER TABLE public.employee_cycle_overrides ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow authenticated access" ON public.employee_cycle_overrides FOR ALL USING (auth.role() = 'authenticated');
