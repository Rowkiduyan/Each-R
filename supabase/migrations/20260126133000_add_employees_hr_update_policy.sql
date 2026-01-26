-- Allow HR (and Admin) users to update employee requirements.
--
-- Motivation: HR validations of employee requirements (including HR-requested docs stored in employees.requirements.hr_requests)
-- may silently fail under RLS (0 rows updated) unless an explicit UPDATE policy exists.

DO $$
BEGIN
  IF to_regclass('public.employees') IS NULL THEN
    -- Table not present in this environment; skip.
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'employees'
      AND policyname = 'hr_can_update_employee_requirements'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY hr_can_update_employee_requirements
      ON public.employees
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('HR', 'Admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('HR', 'Admin')
        )
      );
    $policy$;
  END IF;
END $$;
