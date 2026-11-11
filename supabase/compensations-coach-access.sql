-- =============================================================================
-- Compensações: treinadores podem ler/criar/agendar
-- =============================================================================

DROP POLICY IF EXISTS "lesson_compensations_coach_select" ON lesson_compensations;
DROP POLICY IF EXISTS "lesson_compensations_coach_insert" ON lesson_compensations;
DROP POLICY IF EXISTS "lesson_compensations_coach_update" ON lesson_compensations;

CREATE POLICY "lesson_compensations_coach_select"
ON lesson_compensations
FOR SELECT
TO authenticated
USING (public.is_coach() OR public.is_admin());

CREATE POLICY "lesson_compensations_coach_insert"
ON lesson_compensations
FOR INSERT
TO authenticated
WITH CHECK (public.is_coach() OR public.is_admin());

CREATE POLICY "lesson_compensations_coach_update"
ON lesson_compensations
FOR UPDATE
TO authenticated
USING (public.is_coach() OR public.is_admin())
WITH CHECK (public.is_coach() OR public.is_admin());

-- Coaches may cancel an open compensation they created for a missed lesson.
DROP POLICY IF EXISTS "lesson_compensations_coach_delete" ON lesson_compensations;

CREATE POLICY "lesson_compensations_coach_delete"
ON lesson_compensations
FOR DELETE
TO authenticated
USING (
  (public.is_coach() OR public.is_admin())
  AND status IN ('pending', 'approved')
);
