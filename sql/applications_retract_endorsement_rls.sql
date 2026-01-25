-- Allow agency users to retract their own endorsed applications
-- This policy lets the authenticated user update applications they endorsed.
-- Adjust role check if your profiles table uses different values.

drop policy if exists "agency can retract own endorsements" on public.applications;

create policy "agency can retract own endorsements"
  on public.applications
  for update
  using (
    -- must be authenticated
    auth.uid() is not null
    -- must be an Agency role
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role) = 'agency'
    )
    -- must be the endorser (stored in payload.meta)
    and (
      (nullif(payload->'meta'->>'endorsed_by_auth_user_id',''))::uuid = auth.uid()
      or (nullif(payload->>'endorsed_by_auth_user_id',''))::uuid = auth.uid()
      or (nullif(payload->'meta'->>'endorsedByAuthUserId',''))::uuid = auth.uid()
      or (nullif(payload->>'endorsedByAuthUserId',''))::uuid = auth.uid()
      or (nullif(payload->'meta'->>'endorsed_by_profile_id',''))::uuid = auth.uid()
      or (nullif(payload->>'endorsed_by_profile_id',''))::uuid = auth.uid()
      or (nullif(payload->'meta'->>'endorsedByProfileId',''))::uuid = auth.uid()
      or (nullif(payload->>'endorsedByProfileId',''))::uuid = auth.uid()
    )
  )
  with check (true);
