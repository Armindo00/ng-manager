-- =============================================================================
-- NG Manager - Sessões de videoanálise (registo manual pelos treinadores)
-- =============================================================================

CREATE TABLE IF NOT EXISTS video_analysis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  coach_name text NOT NULL DEFAULT '',
  date text NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_analysis_sessions_coach_idx
  ON video_analysis_sessions (coach_id);

CREATE INDEX IF NOT EXISTS video_analysis_sessions_date_idx
  ON video_analysis_sessions (date);

ALTER TABLE video_analysis_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_analysis_admin_all" ON video_analysis_sessions;
DROP POLICY IF EXISTS "video_analysis_coach_select" ON video_analysis_sessions;
DROP POLICY IF EXISTS "video_analysis_coach_insert" ON video_analysis_sessions;
DROP POLICY IF EXISTS "video_analysis_coach_update" ON video_analysis_sessions;
DROP POLICY IF EXISTS "video_analysis_coach_delete" ON video_analysis_sessions;

CREATE POLICY "video_analysis_admin_all"
ON video_analysis_sessions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "video_analysis_coach_select"
ON video_analysis_sessions
FOR SELECT
TO authenticated
USING (
  public.is_coach()
  AND video_analysis_sessions.coach_id::text = public.current_app_user_id()
);

CREATE POLICY "video_analysis_coach_insert"
ON video_analysis_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_coach()
  AND video_analysis_sessions.coach_id::text = public.current_app_user_id()
);

CREATE POLICY "video_analysis_coach_update"
ON video_analysis_sessions
FOR UPDATE
TO authenticated
USING (
  public.is_coach()
  AND video_analysis_sessions.coach_id::text = public.current_app_user_id()
)
WITH CHECK (
  public.is_coach()
  AND video_analysis_sessions.coach_id::text = public.current_app_user_id()
);

CREATE POLICY "video_analysis_coach_delete"
ON video_analysis_sessions
FOR DELETE
TO authenticated
USING (
  public.is_coach()
  AND video_analysis_sessions.coach_id::text = public.current_app_user_id()
);

-- Treinadores também precisam de ler treinos onde foram 2.º treinador,
-- para a contagem mensal incluir essas sessões.
CREATE OR REPLACE FUNCTION public.coach_is_secondary_in_notes(notes text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM coaches
    WHERE coaches.id::text = public.current_app_user_id()
      AND coalesce(notes, '') ~* '^SECONDARY_COACH='
      AND lower(trim(coaches.name)) = lower(trim(
        regexp_replace(
          split_part(coalesce(notes, ''), E'\n', 1),
          '^SECONDARY_COACH=',
          '',
          'i'
        )
      ))
  );
$$;

DROP POLICY IF EXISTS "lessons_select" ON lessons;

CREATE POLICY "lessons_select"
ON lessons
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_coach()
    AND (
      lessons.coach_id::text = public.current_app_user_id()
      OR public.coach_is_secondary_in_notes(
        split_part(coalesce(lessons.coach_notes, ''), E'\n', 1)
      )
    )
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
