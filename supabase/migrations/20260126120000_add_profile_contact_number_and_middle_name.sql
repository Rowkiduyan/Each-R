-- Add missing columns used by AgencyProfile/AdminCreate
-- These are safe additive changes for existing apps.

alter table if exists public.profiles
  add column if not exists contact_number text;

alter table if exists public.profiles
  add column if not exists middle_name text;
