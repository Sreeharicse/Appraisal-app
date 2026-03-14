-- Revert Script for Auto-ID Generation

-- 1. Drop Triggers
DROP TRIGGER IF EXISTS trg_generate_department_code ON public.departments;
DROP TRIGGER IF EXISTS trg_generate_designation_code ON public.designations;
DROP TRIGGER IF EXISTS trg_generate_employee_code ON public.profiles;

-- 2. Drop Functions
DROP FUNCTION IF EXISTS generate_department_code();
DROP FUNCTION IF EXISTS generate_designation_code();
DROP FUNCTION IF EXISTS generate_employee_code();

-- 3. Drop Columns
ALTER TABLE public.departments DROP COLUMN IF EXISTS department_code;
ALTER TABLE public.designations DROP COLUMN IF EXISTS designation_code;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS employee_code;

-- 4. Drop Sequences
DROP SEQUENCE IF EXISTS department_seq CASCADE;
DROP SEQUENCE IF EXISTS designation_seq CASCADE;
DROP SEQUENCE IF EXISTS profile_seq CASCADE;
