-- ===========================================================
-- create_question_sets.sql — Run this in Supabase SQL Editor
-- ===========================================================

-- STEP 1: Create the question_sets table
CREATE TABLE IF NOT EXISTS public.question_sets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    description text,
    questions   jsonb NOT NULL DEFAULT '[]',
    created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "question_sets_select" ON public.question_sets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "question_sets_insert" ON public.question_sets
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
    );

CREATE POLICY "question_sets_update" ON public.question_sets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
    );

CREATE POLICY "question_sets_delete" ON public.question_sets
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
    );

-- STEP 2: Add question_set_id column to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS question_set_id uuid REFERENCES public.question_sets(id) ON DELETE SET NULL;

-- STEP 3: Seed the default "Common" question set (4 sections, 12 questions)
INSERT INTO public.question_sets (name, description, questions) VALUES
(
    'Common Question Set',
    'Default 4-section set covering Job-specific, Problem-solving, Leadership, and Adaptability.',
    '[
        {"id":"q1","label":"1. What do you think sets you apart in this role?","desc":"Reflect on the unique skills, experiences, or qualities you bring to this position that differentiate you from others.","section":"Job-specific"},
        {"id":"q2","label":"2. How do you stay updated with industry trends?","desc":"Describe the methods, resources, or habits you use to keep your knowledge current and relevant to your field.","section":"Job-specific"},
        {"id":"q3","label":"3. Can you walk me through a recent project?","desc":"Share a recent project you are proud of — include your role, the challenges faced, and the outcome achieved.","section":"Job-specific"},
        {"id":"q4","label":"4. Describe a tough problem you solved. How did you approach it?","desc":"Think of a complex challenge you encountered and walk through your structured thinking and resolution process.","section":"Problem-solving"},
        {"id":"q5","label":"5. How do you prioritize tasks when faced with multiple deadlines?","desc":"Explain your approach to managing competing priorities and how you ensure the most important work gets done first.","section":"Problem-solving"},
        {"id":"q6","label":"6. What is your process for making tough decisions?","desc":"Describe how you weigh options, gather information, and commit to a course of action under pressure or uncertainty.","section":"Problem-solving"},
        {"id":"q7","label":"7. Do you lead or participate in any initiatives outside work?","desc":"Share examples of leadership, volunteering, or community initiatives that reflect your drive beyond your core role.","section":"Leadership & Initiative"},
        {"id":"q8","label":"8. How do you motivate your team or colleagues?","desc":"Describe strategies or examples of how you inspire and uplift others to perform at their best.","section":"Leadership & Initiative"},
        {"id":"q9","label":"9. Can you give an example of taking a calculated risk?","desc":"Describe a situation where you stepped beyond your comfort zone with a deliberate risk and what the outcome was.","section":"Leadership & Initiative"},
        {"id":"q10","label":"10. How do you handle change or unexpected setbacks?","desc":"Describe your mindset and approach when plans change unexpectedly or a project hits a major obstacle.","section":"Adaptability & Resilience"},
        {"id":"q11","label":"11. Can you describe a situation where you adapted to a new process?","desc":"Share an example where you successfully transitioned to a new workflow, tool, or team structure.","section":"Adaptability & Resilience"},
        {"id":"q12","label":"12. How do you bounce back from failures?","desc":"Reflect on a past failure or setback and describe the steps you took to recover, learn, and move forward.","section":"Adaptability & Resilience"}
    ]'::jsonb
);
