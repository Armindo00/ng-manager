-- =============================================================================
-- NG Manager - Corrigir políticas RLS de compensações
-- Executar se compensations.sql falhou nas políticas de aluno
-- =============================================================================

DROP POLICY IF EXISTS "lesson_compensations_student_insert" ON lesson_compensations;
DROP POLICY IF EXISTS "lesson_compensations_student_select_own" ON lesson_compensations;

CREATE POLICY "lesson_compensations_student_insert"
ON lesson_compensations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_student()
  AND lesson_compensations.student_id::text = public.current_student_id()
);

CREATE POLICY "lesson_compensations_student_select_own"
ON lesson_compensations
FOR SELECT
TO authenticated
USING (
  public.is_student()
  AND lesson_compensations.student_id::text = public.current_student_id()
);
