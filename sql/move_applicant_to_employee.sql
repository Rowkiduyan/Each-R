CREATE OR REPLACE FUNCTION public.move_applicant_to_employee(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_app applications;
  v_payload jsonb;
  v_form jsonb;
  v_job jsonb;
  v_first_name text;
  v_last_name text;
  v_middle_name text;
  v_email text;
  v_contact_number text;
  v_position text;
  v_depot text;
  v_department text;
  v_work_email text;
  v_employee_id uuid;
  v_first_initial text;
BEGIN
  SELECT * INTO v_app FROM applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'application_not_found', 'message', 'Application not found');
  END IF;

  v_payload := v_app.payload;
  v_form := COALESCE(v_payload->'form', v_payload->'applicant', v_payload);
  v_job := v_payload->'job';

  v_first_name := COALESCE(v_form->>'firstName', v_form->>'fname', v_form->>'first_name');
  v_last_name := COALESCE(v_form->>'lastName', v_form->>'lname', v_form->>'last_name');
  v_middle_name := COALESCE(v_form->>'middleName', v_form->>'mname', v_form->>'middle_name', '');

  v_email := COALESCE(
    v_form->>'email',
    v_payload->>'email',
    v_payload->'applicant'->>'email'
  );
  v_contact_number := COALESCE(v_form->>'contactNumber', v_form->>'contact_number', v_form->>'contact', v_form->>'phone');

  v_position := v_job->>'title';
  v_depot := v_job->>'depot';
  v_department := COALESCE(v_job->>'department', 'Operations');

  IF v_first_name IS NULL OR v_first_name = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_first_name', 'message', 'First name is required');
  END IF;

  IF v_last_name IS NULL OR v_last_name = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_last_name', 'message', 'Last name is required');
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_email', 'message', 'Email is required');
  END IF;

  v_first_initial := LOWER(LEFT(v_first_name, 1));
  v_work_email := v_first_initial || LOWER(v_last_name) || '@roadwise.com';

  IF EXISTS (SELECT 1 FROM employees WHERE email = v_work_email) THEN
    SELECT id INTO v_employee_id FROM employees WHERE email = v_work_email;

    UPDATE applications
    SET status = 'hired',
        updated_at = NOW()
    WHERE id = p_application_id;

    RETURN jsonb_build_object(
      'ok', true,
      'employee_id', v_employee_id,
      'email', v_work_email,
      'department', v_department,
      'depot', v_depot,
      'position', v_position,
      'fname', v_first_name,
      'lname', v_last_name,
      'existing', true,
      'message', 'Employee already exists'
    );
  END IF;

  INSERT INTO employees (
    email,
    fname,
    lname,
    mname,
    contact_number,
    position,
    depot,
    department,
    source,
    status,
    hired_at
  ) VALUES (
    v_work_email,
    v_first_name,
    v_last_name,
    v_middle_name,
    v_contact_number,
    v_position,
    v_depot,
    v_department,
    'Direct',
    'Probationary',
    NOW()
  )
  RETURNING id INTO v_employee_id;

  UPDATE applications
  SET status = 'hired',
      updated_at = NOW()
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'ok', true,
    'employee_id', v_employee_id,
    'email', v_work_email,
    'department', v_department,
    'depot', v_depot,
    'position', v_position,
    'fname', v_first_name,
    'lname', v_last_name
  );
END;
$function$;
