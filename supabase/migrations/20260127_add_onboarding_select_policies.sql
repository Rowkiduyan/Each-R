-- Allow Agency (and HR/Admin) users to read onboarding records.
--
-- Motivation: HR can create onboarding records, but Agency views may not reflect them
-- if RLS blocks SELECT on public.onboarding.

DO $$
BEGIN
  IF to_regclass('public.onboarding') IS NULL THEN
    -- Table not present in this environment; skip.
    RETURN;
  END IF;

  -- Ensure RLS is enabled so policies take effect (safe if already enabled).
  EXECUTE 'ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY';

  -- HR/Admin can read onboarding
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'onboarding'
      AND policyname = 'hr_admin_can_select_onboarding'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY hr_admin_can_select_onboarding
      ON public.onboarding
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('HR', 'Admin')
        )
      );
    $policy$;
  END IF;

  -- Agency can read onboarding for employees that belong to them
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'onboarding'
      AND policyname = 'agency_can_select_onboarding'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY agency_can_select_onboarding
      ON public.onboarding
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'Agency'
        )
        AND EXISTS (
          SELECT 1
          FROM public.employees e
          WHERE e.id = onboarding.employee_id
            AND (e.agency_profile_id = auth.uid() OR e.endorsed_by_agency_id = auth.uid())
        )
      );
    $policy$;
  END IF;
END $$;
