-- =============================================================================
-- CORREÇÃO: generate_lessons_from_recurring
-- Colar e executar no SQL Editor se o botão "Gerar treinos" der erro
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_lessons_from_recurring()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  training RECORD;
  today_date date := (timezone('Europe/Lisbon', now()))::date;
  today_weekday text := public.get_portuguese_weekday(
    (timezone('Europe/Lisbon', now()))::date
  );
  group_students uuid[];
  created_count integer := 0;
  jwt_role text := COALESCE(auth.jwt() ->> 'role', '');
  user_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  is_allowed boolean := false;
BEGIN
  IF jwt_role = 'service_role' OR auth.jwt() IS NULL THEN
    is_allowed := true;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM app_users
      WHERE lower(email) = user_email
        AND role = 'admin'
    )
    INTO is_allowed;
  END IF;

  IF NOT is_allowed THEN
    RAISE EXCEPTION 'Apenas administradores podem gerar treinos.';
  END IF;

  FOR training IN
    SELECT
      rt.id,
      rt.group_id,
      rt.group_name,
      rt.coach_id,
      rt.coach_name,
      rt.van,
      rt.week_day,
      rt.repeat_until
    FROM recurring_trainings rt
    WHERE rt.week_day = today_weekday
      AND rt.repeat_until::text >= to_char(today_date, 'YYYY-MM-DD')
  LOOP
    IF EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.date::text = to_char(today_date, 'YYYY-MM-DD')
        AND l.group_id::text = training.group_id::text
        AND l.coach_name = training.coach_name
    ) THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(to_jsonb(g.student_ids))::uuid
      ),
      ARRAY[]::uuid[]
    )
    INTO group_students
    FROM groups g
    WHERE g.id::text = training.group_id::text;

    INSERT INTO lessons (
      id,
      date,
      time,
      beach,
      status,
      group_id,
      group_name,
      coach_id,
      coach_name,
      van,
      pickup_time,
      coach_pickups,
      coach_notes,
      booked_student_ids,
      present_student_ids,
      responses
    ) VALUES (
      gen_random_uuid(),
      to_char(today_date, 'YYYY-MM-DD'),
      '',
      '',
      'draft',
      training.group_id,
      training.group_name,
      training.coach_id,
      training.coach_name,
      training.van,
      '',
      '[]'::jsonb,
      '',
      COALESCE(group_students, ARRAY[]::uuid[]),
      ARRAY[]::uuid[],
      '[]'::jsonb
    );

    created_count := created_count + 1;
  END LOOP;

  RETURN created_count;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_lessons_from_recurring() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_lessons_from_recurring() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_lessons_from_recurring() TO service_role;

NOTIFY pgrst, 'reload schema';
