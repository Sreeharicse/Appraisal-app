-- ==========================================================
-- CREATE EMPLOYEE CYCLE OVERRIDES TABLE
-- Run this in your Supabase SQL Editor
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.employee_cycle_overrides (
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES public.cycles(id) ON DELETE CASCADE,
    question_set_id UUID REFERENCES public.question_sets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (employee_id, cycle_id)
);

-- Enable RLS
ALTER TABLE public.employee_cycle_overrides ENABLE ROW LEVEL SECURITY;

-- 1. Anyone authenticated can SELECT/READ (to see their own questions)
CREATE POLICY "authenticated_select_overrides"
    ON public.employee_cycle_overrides FOR SELECT
    TO authenticated
    USING (true);

-- 2. Only HR/Admin can INSERT/UPDATE/DELETE
CREATE POLICY "hr_admin_all_overrides"
    ON public.employee_cycle_overrides FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('hr', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('hr', 'admin')
        )
    );
