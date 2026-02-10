-- Allow Agency users to insert and update their own employee pool records.
--
-- Fixes: "new row violates row-level security policy for table \"employees\"" when Agency adds/imports employees.

DO $$
BEGIN
  IF to_regclass('public.employees') IS NULL THEN
    RETURN;
  END IF;

  -- Ensure RLS is enabled so policies take effect (safe if already enabled).
  EXECUTE 'ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY';

  -- Agency can INSERT employees that belong to them.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'employees'
      AND policyname = 'agency_can_insert_own_employees'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY agency_can_insert_own_employees
      ON public.employees
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'Agency'
        )
        AND agency_profile_id = auth.uid()
        AND source = 'agency'
      );
    $policy$;
  END IF;

  -- Agency can UPDATE employees that belong to them (needed for attaching uploaded docs, etc.).
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'employees'
      AND policyname = 'agency_can_update_own_employees'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY agency_can_update_own_employees
      ON public.employees
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'Agency'
        )
        AND agency_profile_id = auth.uid()
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'Agency'
        )
        AND agency_profile_id = auth.uid()
      );
    $policy$;
  END IF;
END $$;
