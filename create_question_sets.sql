-- ===========================================================
-- STEP 1: Create the question_sets table
-- ===========================================================
CREATE TABLE IF NOT EXISTS public.question_sets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    description text,
    questions   jsonb NOT NULL DEFAULT '[]',
    created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read question sets
CREATE POLICY "question_sets_select" ON public.question_sets
    FOR SELECT TO authenticated USING (true);

-- Only HR and Admin can insert/update/delete
CREATE POLICY "question_sets_insert" ON public.question_sets
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('hr', 'admin')
        )
    );

CREATE POLICY "question_sets_update" ON public.question_sets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('hr', 'admin')
        )
    );

CREATE POLICY "question_sets_delete" ON public.question_sets
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('hr', 'admin')
        )
    );

-- ===========================================================
-- STEP 2: Add question_set_id column to profiles table
-- ===========================================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS question_set_id uuid REFERENCES public.question_sets(id) ON DELETE SET NULL;

-- ===========================================================
-- STEP 3: Seed with 2 default question sets
-- ===========================================================
INSERT INTO public.question_sets (name, description, questions) VALUES
(
    'Standard Employee Set',
    'Default 10-question competency set for all employees.',
    '[
        {"id":"q1","label":"1. Quality of Work","desc":"How consistently do you deliver high-quality work in your role?"},
        {"id":"q2","label":"2. Technical Competency","desc":"Evaluate your technical skills required for your role."},
        {"id":"q3","label":"3. Problem Solving","desc":"Describe your ability to analyze problems and find effective solutions."},
        {"id":"q4","label":"4. Productivity and Efficiency","desc":"How effectively do you manage your workload and meet deadlines?"},
        {"id":"q5","label":"5. Communication Skills","desc":"Evaluate how clearly and effectively you communicate with your team."},
        {"id":"q6","label":"6. Team Collaboration","desc":"How well do you collaborate with colleagues?"},
        {"id":"q7","label":"7. Initiative and Ownership","desc":"Describe situations where you took initiative beyond your assigned responsibilities."},
        {"id":"q8","label":"8. Time Management","desc":"How effectively do you manage your time while balancing multiple responsibilities?"},
        {"id":"q9","label":"9. Contribution to Project Success","desc":"Explain how your work contributed to the success of your projects."},
        {"id":"q10","label":"10. Professional Behavior","desc":"Evaluate how you demonstrate professionalism in the workplace."}
    ]'::jsonb
),
(
    'Senior/Manager Set',
    'Advanced 10-question set for senior staff and team leads.',
    '[
        {"id":"q1","label":"1. Strategic Thinking","desc":"How do you align your work to the broader goals of the organization?"},
        {"id":"q2","label":"2. Technical Leadership","desc":"How do you guide others technically and elevate the team''s skill level?"},
        {"id":"q3","label":"3. Decision Making","desc":"Describe your approach to making critical decisions under pressure."},
        {"id":"q4","label":"4. Delivery Excellence","desc":"How do you ensure high-quality delivery across complex or high-priority projects?"},
        {"id":"q5","label":"5. Stakeholder Communication","desc":"How do you communicate with senior stakeholders and manage expectations?"},
        {"id":"q6","label":"6. Team Development","desc":"How do you mentor or develop the growth of team members?"},
        {"id":"q7","label":"7. Innovation and Improvement","desc":"Describe initiatives where you drove improvement or introduced innovations."},
        {"id":"q8","label":"8. Project Planning & Ownership","desc":"How do you plan, prioritize, and take accountability for your projects?"},
        {"id":"q9","label":"9. Cross-functional Collaboration","desc":"How do you work across teams to deliver impactful outcomes?"},
        {"id":"q10","label":"10. Leadership Presence","desc":"Describe how you inspire and motivate others through your leadership."}
    ]'::jsonb
);
