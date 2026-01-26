-- Introspection helpers for scripts/dbInspect.mjs
--
-- SECURITY NOTE:
-- These functions are granted only to the `service_role` by default.
-- If you want to allow `authenticated` (or `anon`) to call them, add grants
-- explicitly — but be aware that listing tables/columns can leak metadata.

create or replace function public.eachr_list_tables(p_schema text default 'public')
returns table(
  table_schema text,
  table_name text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    t.table_schema,
    t.table_name
  from information_schema.tables t
  where t.table_type = 'BASE TABLE'
    and t.table_schema = p_schema
  order by t.table_name;
$$;

create or replace function public.eachr_table_columns(p_schema text, p_table text)
returns table(
  ordinal_position integer,
  column_name text,
  data_type text,
  is_nullable boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    c.ordinal_position::int,
    c.column_name,
    c.data_type,
    (c.is_nullable = 'YES') as is_nullable
  from information_schema.columns c
  where c.table_schema = p_schema
    and c.table_name = p_table
  order by c.ordinal_position;
$$;

revoke all on function public.eachr_list_tables(text) from public;
revoke all on function public.eachr_table_columns(text, text) from public;

grant execute on function public.eachr_list_tables(text) to service_role;
grant execute on function public.eachr_table_columns(text, text) to service_role;
