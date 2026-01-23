-- Adds salary_range to job_posts and backfills existing rows with a dummy PHP (₱) range.
-- Apply this in Supabase Dashboard (SQL Editor) or via Supabase CLI migrations.

alter table if exists public.job_posts
  add column if not exists salary_range text;

-- Safety default for any older clients/inserts that don't send salary_range.
alter table if exists public.job_posts
  alter column salary_range set default '₱15,000 - ₱25,000';

-- Backfill existing/past posts (and any future rows missing salary_range)
update public.job_posts
set salary_range = '₱15,000 - ₱25,000'
where salary_range is null or btrim(salary_range) = '';
