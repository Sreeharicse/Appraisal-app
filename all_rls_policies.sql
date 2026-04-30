-- ==========================================
-- COMPLETE RLS POLICIES FOR APPRAISAL APP
-- ==========================================

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_cycle_overrides ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (Optional, but good for clean run)
-- DO $$ 
-- DECLARE 
--     pol record;
-- BEGIN
--     FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
--         EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.' || pol.tablename;
--     END LOOP;
-- END $$;

-- ==========================================
-- PROFILES POLICIES
-- ==========================================
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "HR and Admin can delete profiles" ON public.profiles FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "HR and Admin can insert profiles" ON public.profiles FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "HR can update profiles" ON public.profiles FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'hr');
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- CYCLES POLICIES
-- ==========================================
CREATE POLICY "cycles_select" ON public.cycles FOR SELECT USING (true);
CREATE POLICY "cycles_insert" ON public.cycles FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "cycles_update" ON public.cycles FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "cycles_delete" ON public.cycles FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "Allow all to read cycles" ON public.cycles FOR SELECT USING (true);
CREATE POLICY "Allow Admin and HR to insert cycles" ON public.cycles FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "Allow Admin and HR to update cycles" ON public.cycles FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "Allow admin to delete cycles" ON public.cycles FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "HR and Admin can insert cycles" ON public.cycles FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "HR and Admin can update cycles" ON public.cycles FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "HR and Admin can delete cycles" ON public.cycles FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));

-- ==========================================
-- DEPARTMENTS POLICIES
-- ==========================================
CREATE POLICY "Enable read access for all users" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Enable write access for HR and Admin" ON public.departments FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));

-- ==========================================
-- DESIGNATIONS POLICIES
-- ==========================================
CREATE POLICY "Enable read access for all users" ON public.designations FOR SELECT USING (true);
CREATE POLICY "Enable write access for HR and Admin" ON public.designations FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));

-- ==========================================
-- APPROVALS POLICIES
-- ==========================================
CREATE POLICY "appr_select" ON public.approvals FOR SELECT USING (true);
CREATE POLICY "appr_insert" ON public.approvals FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "appr_update" ON public.approvals FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "appr_delete" ON public.approvals FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));

-- ==========================================
-- EVALUATIONS POLICIES
-- ==========================================
CREATE POLICY "ev_select" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "ev_insert" ON public.evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "ev_update" ON public.evaluations FOR UPDATE USING (true);
CREATE POLICY "ev_delete" ON public.evaluations FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));

-- ==========================================
-- SELF REVIEWS POLICIES
-- ==========================================
CREATE POLICY "sr_select" ON public.self_reviews FOR SELECT USING (true);
CREATE POLICY "sr_insert" ON public.self_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "sr_update" ON public.self_reviews FOR UPDATE USING (true);
CREATE POLICY "sr_delete" ON public.self_reviews FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));

-- ==========================================
-- NOTIFICATIONS POLICIES
-- ==========================================
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- EMPLOYEE CYCLE OVERRIDES POLICIES
-- ==========================================
CREATE POLICY "Allow authenticated users to read employee cycle overrides" ON public.employee_cycle_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for all authenticated users" ON public.employee_cycle_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for HR/Admin" ON public.employee_cycle_overrides FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "authenticated_select_overrides" ON public.employee_cycle_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_admin_all_overrides" ON public.employee_cycle_overrides FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));

-- ==========================================
-- QUESTION SETS POLICIES
-- ==========================================
CREATE POLICY "question_sets_select" ON public.question_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "question_sets_insert" ON public.question_sets FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "question_sets_update" ON public.question_sets FOR UPDATE TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
CREATE POLICY "question_sets_delete" ON public.question_sets FOR DELETE TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr'));
