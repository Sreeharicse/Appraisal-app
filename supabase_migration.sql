-- 1. Create Departments Table
CREATE TABLE public.departments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Designations (Job Roles) Table
CREATE TABLE public.designations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add Designation Column to Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS designation TEXT;

-- 4. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Departments
-- Everyone can read departments
CREATE POLICY "Enable read access for all users" ON public.departments
    FOR SELECT USING (true);

-- Only Admins and HR can insert/update/delete departments
CREATE POLICY "Enable write access for HR and Admin" ON public.departments
    FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr')
    );

-- 6. RLS Policies for Designations
-- Everyone can read designations
CREATE POLICY "Enable read access for all users" ON public.designations
    FOR SELECT USING (true);

-- Only Admins and HR can insert/update/delete designations
CREATE POLICY "Enable write access for HR and Admin" ON public.designations
    FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr')
    );

-- 7. Insert some default data to get started
INSERT INTO public.departments (name) VALUES 
('Engineering'), ('Sales'), ('Marketing'), ('Human Resources'), ('Product'), ('Design')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.designations (name) VALUES 
('Software Engineer'), ('Senior Software Engineer'), ('Product Manager'), ('HR Specialist'), ('Sales Executive'), ('UX Designer')
ON CONFLICT (name) DO NOTHING;

-- 8. Add Date Control Columns to Appraisal Cycles
ALTER TABLE public.cycles 
ADD COLUMN IF NOT EXISTS employee_end_date DATE,
ADD COLUMN IF NOT EXISTS manager_end_date DATE;
