-- =============================================================================
-- NG Manager - Row Level Security (RLS)
-- =============================================================================
-- Aplicar no Supabase: SQL Editor > New query > colar e executar
--
-- Regras:
--   admin   -> acesso total
--   coach   -> os seus grupos, treinos, avaliações e alunos associados
--   student -> apenas os seus dados, treinos publicados e avaliações
--
-- IMPORTANTE:
--   - Cada utilizador em app_users deve ter o mesmo email do Supabase Auth
--   - Treinadores: app_users.id deve coincidir com coaches.id
--   - Alunos: app_users.student_id deve apontar para students.id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(auth.jwt() ->> 'email');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_users
    WHERE lower(email) = public.auth_email()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_users
    WHERE lower(email) = public.auth_email()
      AND role = 'coach'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_users
    WHERE lower(email) = public.auth_email()
      AND role = 'student'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id::text
  FROM app_users
  WHERE lower(email) = public.auth_email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_id::text
  FROM app_users
  WHERE lower(email) = public.auth_email()
    AND role = 'student'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.student_in_array(student_ids_array anyarray, target_student_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(student_ids_array) AS student_id_value
    WHERE student_id_value::text = target_student_id
  );
$$;

CREATE OR REPLACE FUNCTION public.coach_can_access_student(target_student_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM groups g
    WHERE g.coach_id::text = public.current_app_user_id()
      AND public.student_in_array(g.student_ids, target_student_id)
  )
  OR EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.coach_id::text = public.current_app_user_id()
      AND public.student_in_array(l.booked_student_ids, target_student_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.student_booked_in_lesson(
  booked_student_ids_array anyarray,
  target_student_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.student_in_array(booked_student_ids_array, target_student_id);
$$;

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_trainings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_users_select" ON app_users;
DROP POLICY IF EXISTS "app_users_admin_write" ON app_users;

DROP POLICY IF EXISTS "students_select" ON students;
DROP POLICY IF EXISTS "students_admin_write" ON students;

DROP POLICY IF EXISTS "coaches_select" ON coaches;
DROP POLICY IF EXISTS "coaches_admin_write" ON coaches;

DROP POLICY IF EXISTS "groups_select" ON groups;
DROP POLICY IF EXISTS "groups_admin_write" ON groups;

DROP POLICY IF EXISTS "lessons_select" ON lessons;
DROP POLICY IF EXISTS "lessons_admin_write" ON lessons;
DROP POLICY IF EXISTS "lessons_coach_write" ON lessons;
DROP POLICY IF EXISTS "lessons_coach_update" ON lessons;
DROP POLICY IF EXISTS "lessons_coach_delete" ON lessons;
DROP POLICY IF EXISTS "lessons_student_update" ON lessons;

DROP POLICY IF EXISTS "evaluations_select" ON evaluations;
DROP POLICY IF EXISTS "evaluations_admin_write" ON evaluations;
DROP POLICY IF EXISTS "evaluations_coach_write" ON evaluations;
DROP POLICY IF EXISTS "evaluations_coach_update" ON evaluations;
DROP POLICY IF EXISTS "evaluations_coach_delete" ON evaluations;

DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_admin_write" ON payments;

DROP POLICY IF EXISTS "recurring_select" ON recurring_trainings;
DROP POLICY IF EXISTS "recurring_admin_write" ON recurring_trainings;

DROP POLICY IF EXISTS "inventory_admin_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_admin_write" ON inventory_items;

CREATE POLICY "app_users_select"
ON app_users
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR lower(email) = public.auth_email()
);

CREATE POLICY "app_users_admin_write"
ON app_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "students_select"
ON students
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_coach()
    AND public.coach_can_access_student(students.id::text)
  )
  OR (
    public.is_student()
    AND students.id::text = public.current_student_id()
  )
);

CREATE POLICY "students_admin_write"
ON students
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "coaches_select"
ON coaches
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_coach()
    AND coaches.id::text = public.current_app_user_id()
  )
);

CREATE POLICY "coaches_admin_write"
ON coaches
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "groups_select"
ON groups
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_coach()
    AND groups.coach_id::text = public.current_app_user_id()
  )
);

CREATE POLICY "groups_admin_write"
ON groups
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "lessons_select"
ON lessons
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_coach()
    AND lessons.coach_id::text = public.current_app_user_id()
  )
  OR (
    public.is_student()
    AND lessons.status IN ('published', 'finished')
    AND public.student_booked_in_lesson(
      lessons.booked_student_ids,
      public.current_student_id()
    )
  )
);

CREATE POLICY "lessons_admin_write"
ON lessons
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "lessons_coach_write"
ON lessons
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_coach()
  AND lessons.coach_id::text = public.current_app_user_id()
);

CREATE POLICY "lessons_coach_update"
ON lessons
FOR UPDATE
TO authenticated
USING (
  public.is_coach()
  AND lessons.coach_id::text = public.current_app_user_id()
)
WITH CHECK (
  public.is_coach()
  AND lessons.coach_id::text = public.current_app_user_id()
);

CREATE POLICY "lessons_coach_delete"
ON lessons
FOR DELETE
TO authenticated
USING (
  public.is_coach()
  AND lessons.coach_id::text = public.current_app_user_id()
);

-- Alunos respondem via RPC update_lesson_response (lesson-rpcs.sql)

CREATE POLICY "evaluations_select"
ON evaluations
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_coach()
    AND evaluations.coach_id::text = public.current_app_user_id()
  )
  OR (
    public.is_student()
    AND evaluations.student_id::text = public.current_student_id()
  )
);

CREATE POLICY "evaluations_admin_write"
ON evaluations
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "evaluations_coach_write"
ON evaluations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_coach()
  AND evaluations.coach_id::text = public.current_app_user_id()
  AND public.coach_can_access_student(evaluations.student_id::text)
);

CREATE POLICY "evaluations_coach_update"
ON evaluations
FOR UPDATE
TO authenticated
USING (
  public.is_coach()
  AND evaluations.coach_id::text = public.current_app_user_id()
  AND public.coach_can_access_student(evaluations.student_id::text)
)
WITH CHECK (
  public.is_coach()
  AND evaluations.coach_id::text = public.current_app_user_id()
  AND public.coach_can_access_student(evaluations.student_id::text)
);

CREATE POLICY "evaluations_coach_delete"
ON evaluations
FOR DELETE
TO authenticated
USING (
  public.is_coach()
  AND evaluations.coach_id::text = public.current_app_user_id()
  AND public.coach_can_access_student(evaluations.student_id::text)
);

CREATE POLICY "payments_select"
ON payments
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_student()
    AND payments.student_id::text = public.current_student_id()
  )
);

CREATE POLICY "payments_admin_write"
ON payments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "recurring_select"
ON recurring_trainings
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_coach()
    AND recurring_trainings.coach_id::text = public.current_app_user_id()
  )
);

CREATE POLICY "recurring_admin_write"
ON recurring_trainings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "inventory_admin_select"
ON inventory_items
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "inventory_admin_write"
ON inventory_items
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT EXECUTE ON FUNCTION public.auth_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_in_array(anyarray, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_can_access_student(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_booked_in_lesson(anyarray, text) TO authenticated;
