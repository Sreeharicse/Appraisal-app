-- Drop ALL existing conflicting policies to start fresh
DO $$ 
DECLARE 
    pol record;
BEGIN
    -- 1. Drop ALL existing policies on self_reviews
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'self_reviews' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.self_reviews', pol.policyname);
    END LOOP;

    -- 2. Drop ALL existing policies on evaluations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'evaluations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.evaluations', pol.policyname);
    END LOOP;
END $$;

-- Enable Row Level Security (in case it was disabled)
ALTER TABLE public.self_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- REVERT TO PREVIOUS POLICIES FOR self_reviews
CREATE POLICY "Enable read access for all users" ON public.self_reviews FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.self_reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Enable update access for authenticated users" ON public.self_reviews FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable delete access for authenticated users" ON public.self_reviews FOR DELETE USING (auth.uid() IS NOT NULL);

-- REVERT TO PREVIOUS POLICIES FOR evaluations
CREATE POLICY "Enable read access for all users" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.evaluations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Enable update access for authenticated users" ON public.evaluations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable delete access for authenticated users" ON public.evaluations FOR DELETE USING (auth.uid() IS NOT NULL);
