-- Retract an endorsed application (bypasses RLS via security definer)
-- Only allows the agency user who endorsed it to retract.

create or replace function public.retract_endorsement(p_application_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_payload jsonb;
  v_endorser uuid;
  v_endorser_profile uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if lower(coalesce(v_role, '')) <> 'agency' then
    raise exception 'Only agency users can retract endorsements';
  end if;

  select payload into v_payload from public.applications where id = p_application_id;
  if v_payload is null then
    raise exception 'Application not found';
  end if;

  v_endorser := nullif(coalesce(
    v_payload->'meta'->>'endorsed_by_auth_user_id',
    v_payload->>'endorsed_by_auth_user_id',
    v_payload->'meta'->>'endorsedByAuthUserId',
    v_payload->>'endorsedByAuthUserId'
  ), '')::uuid;

  v_endorser_profile := nullif(coalesce(
    v_payload->'meta'->>'endorsed_by_profile_id',
    v_payload->>'endorsed_by_profile_id',
    v_payload->'meta'->>'endorsedByProfileId',
    v_payload->>'endorsedByProfileId'
  ), '')::uuid;

  if v_endorser is null and v_endorser_profile is null then
    raise exception 'Endorser not found in payload';
  end if;

  if v_endorser is not null and v_endorser <> v_user_id then
    raise exception 'Not authorized to retract this endorsement';
  end if;

  if v_endorser is null and v_endorser_profile is not null and v_endorser_profile <> v_user_id then
    raise exception 'Not authorized to retract this endorsement';
  end if;

  update public.applications
  set
    endorsed = false,
    status = 'retracted',
    payload = jsonb_set(
      jsonb_set(
        coalesce(payload, '{}'::jsonb),
        '{endorsement_retracted}',
        'true'::jsonb,
        true
      ),
      '{endorsement_retracted_at}',
      to_jsonb(now() at time zone 'utc'),
      true
    )
  where id = p_application_id;
end;
$$;

revoke all on function public.retract_endorsement(uuid) from public;
grant execute on function public.retract_endorsement(uuid) to authenticated;
