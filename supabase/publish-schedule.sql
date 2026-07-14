-- =============================================================================
-- NG Manager - Publicar horários semanais no servidor (Europe/Lisbon)
-- Substitui geração de treinos no browser
-- =============================================================================

CREATE OR REPLACE FUNCTION public.week_day_to_dow(week_day text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE week_day
    WHEN 'Domingo' THEN 0
    WHEN 'Segunda' THEN 1
    WHEN 'Terça' THEN 2
    WHEN 'Quarta' THEN 3
    WHEN 'Quinta' THEN 4
    WHEN 'Sexta' THEN 5
    WHEN 'Sábado' THEN 6
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.publish_recurring_schedule(
  p_training_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  training RECORD;
  start_date date := (timezone('Europe/Lisbon', now()))::date;
  end_date date;
  cursor_date date;
  target_dow integer;
  group_students uuid[];
  created_count integer := 0;
  skipped_count integer := 0;
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
    RAISE EXCEPTION 'Apenas administradores podem publicar horários.';
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
      rt.repeat_until,
      rt.default_time,
      rt.default_beach
    FROM recurring_trainings rt
    WHERE (p_training_id IS NULL OR rt.id = p_training_id)
      AND COALESCE(rt.active, true) = true
  LOOP
    target_dow := public.week_day_to_dow(training.week_day);

    IF target_dow IS NULL THEN
      CONTINUE;
    END IF;

    end_date := training.repeat_until::date;
    cursor_date := start_date;

    WHILE cursor_date <= end_date LOOP
      IF EXTRACT(DOW FROM cursor_date)::integer = target_dow THEN
        IF EXISTS (
          SELECT 1
          FROM lessons l
          WHERE l.date = to_char(cursor_date, 'YYYY-MM-DD')
            AND l.group_id::text = training.group_id::text
        ) THEN
          skipped_count := skipped_count + 1;
        ELSE
          SELECT COALESCE(
            ARRAY(
              SELECT unnest(g.student_ids)
            ),
            ARRAY[]::uuid[]
          )
          INTO group_students
          FROM groups g
          WHERE g.id = training.group_id;

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
            to_char(cursor_date, 'YYYY-MM-DD'),
            COALESCE(training.default_time, ''),
            COALESCE(NULLIF(training.default_beach, ''), 'A definir'),
            'published',
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
        END IF;
      END IF;

      cursor_date := cursor_date + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'created', created_count,
    'skipped', skipped_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_recurring_schedule(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_recurring_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_recurring_schedule(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.week_day_to_dow(text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
