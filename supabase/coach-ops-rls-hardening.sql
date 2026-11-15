-- =============================================================================
-- Multi-coach + packs: leitura de aulas/treinadores e update de packRemaining
-- =============================================================================

-- Treinadores veem todos os colegas (2.º treinador no select)
DROP POLICY IF EXISTS "coaches_select" ON coaches;
DROP POLICY IF EXISTS "coaches_select_all" ON coaches;

CREATE POLICY "coaches_select_all"
ON coaches
FOR SELECT
TO authenticated
USING (public.is_admin() OR public.is_coach());

-- Treinadores veem todas as sessões (evita duplicar o mesmo grupo no Hoje)
DROP POLICY IF EXISTS "lessons_select" ON lessons;

CREATE POLICY "lessons_select"
ON lessons
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.is_coach()
  OR (
    public.is_student()
    AND lessons.status IN ('published', 'finished')
    AND public.student_booked_in_lesson(
      lessons.booked_student_ids,
      public.current_student_id()
    )
  )
);

-- Principal ou 2.º treinador podem atualizar a sessão
DROP POLICY IF EXISTS "lessons_coach_update" ON lessons;

CREATE POLICY "lessons_coach_update"
ON lessons
FOR UPDATE
TO authenticated
USING (
  public.is_coach()
  AND (
    lessons.coach_id::text = public.current_app_user_id()
    OR public.coach_is_secondary_in_notes(
      split_part(coalesce(lessons.coach_notes, ''), E'\n', 1)
    )
  )
)
WITH CHECK (
  public.is_coach()
  AND (
    lessons.coach_id::text = public.current_app_user_id()
    OR public.coach_is_secondary_in_notes(
      split_part(coalesce(lessons.coach_notes, ''), E'\n', 1)
    )
  )
);

-- Treinadores podem atualizar alunos (ex.: packRemaining ao marcar presença)
DROP POLICY IF EXISTS "students_coach_update" ON students;

CREATE POLICY "students_coach_update"
ON students
FOR UPDATE
TO authenticated
USING (public.is_coach())
WITH CHECK (public.is_coach());

-- Remover duplicados do mesmo grupo no mesmo dia antes do índice único
DELETE FROM lessons
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY date, group_name
        ORDER BY CASE WHEN status = 'finished' THEN 0 ELSE 1 END, id
      ) AS rn
    FROM lessons
    WHERE group_name IS NOT NULL
      AND btrim(group_name) <> ''
      AND status IS DISTINCT FROM 'draft'
  ) ranked
  WHERE ranked.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS lessons_date_group_unique
ON lessons (date, group_name)
WHERE group_name IS NOT NULL
  AND btrim(group_name) <> ''
  AND status IS DISTINCT FROM 'draft';
