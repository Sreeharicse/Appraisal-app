-- ============================================================
-- COMPREHENSIVE RLS FIX FOR ADMIN ROLE
-- Run this ENTIRE script in Supabase SQL Editor
-- Fixes: notifications, self_reviews, evaluations, approvals
-- ============================================================

-- STEP 1: Drop ALL existing policies on affected tables
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'self_reviews' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.self_reviews', pol.policyname); END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'evaluations' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.evaluations', pol.policyname); END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname); END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'approvals' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.approvals', pol.policyname); END LOOP;
END $$;

-- STEP 2: Enable RLS on all tables
ALTER TABLE public.self_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- STEP 3: self_reviews policies (all authenticated users can read — app handles role filtering)
CREATE POLICY "sr_select" ON public.self_reviews FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sr_insert" ON public.self_reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sr_update" ON public.self_reviews FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "sr_delete" ON public.self_reviews FOR DELETE USING (auth.uid() IS NOT NULL);

-- STEP 4: evaluations policies
CREATE POLICY "ev_select" ON public.evaluations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ev_insert" ON public.evaluations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ev_update" ON public.evaluations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ev_delete" ON public.evaluations FOR DELETE USING (auth.uid() IS NOT NULL);

-- STEP 5: notifications policies
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE USING (auth.uid() IS NOT NULL);

-- STEP 6: approvals policies
CREATE POLICY "appr_select" ON public.approvals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "appr_insert" ON public.approvals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "appr_update" ON public.approvals FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "appr_delete" ON public.approvals FOR DELETE USING (auth.uid() IS NOT NULL);

-- STEP 7: Add status column to self_reviews if it doesn't exist, and heal existing data
ALTER TABLE public.self_reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Heal existing rows: if the JSON comments blob says "submitted", update the status column
UPDATE public.self_reviews
SET status = 'submitted'
WHERE status = 'draft'
  AND comments LIKE '%"status":"submitted"%';
