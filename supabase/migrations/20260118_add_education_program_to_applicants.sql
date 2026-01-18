-- Adds Strand/Program field support for Applicant "My Profile"
-- Run this in Supabase SQL editor (or via Supabase CLI migrations) for the correct project.

alter table public.applicants
  add column if not exists education_program text;

comment on column public.applicants.education_program is
  'Optional education strand/program (e.g., SHS strand or course/program).';
