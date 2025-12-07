-- Add new file columns for agreement documents in applications table
-- Run this SQL in your Supabase SQL editor

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS undertaking_file TEXT,
ADD COLUMN IF NOT EXISTS application_form_file TEXT,
ADD COLUMN IF NOT EXISTS undertaking_duties_file TEXT,
ADD COLUMN IF NOT EXISTS pre_employment_requirements_file TEXT,
ADD COLUMN IF NOT EXISTS id_form_file TEXT;

-- Add comments to describe what each column stores
COMMENT ON COLUMN public.applications.undertaking_file IS 'Path to uploaded undertaking file in storage bucket';
COMMENT ON COLUMN public.applications.application_form_file IS 'Path to uploaded application form file in storage bucket';
COMMENT ON COLUMN public.applications.undertaking_duties_file IS 'Path to uploaded undertaking of duties and responsibilities file in storage bucket';
COMMENT ON COLUMN public.applications.pre_employment_requirements_file IS 'Path to uploaded Roadwise pre employment requirements file in storage bucket';
COMMENT ON COLUMN public.applications.id_form_file IS 'Path to uploaded ID form file in storage bucket';

