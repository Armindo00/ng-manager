-- =============================================================================
-- NG Manager - Compensações de treinos
-- Executar no Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS lesson_compensations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  missed_lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  compensation_lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'scheduled', 'completed', 'rejected')
  ),
  admin_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_compensations_student_missed_unique
  ON lesson_compensations (student_id, missed_lesson_id);

CREATE INDEX IF NOT EXISTS lesson_compensations_status_idx
  ON lesson_compensations (status);

CREATE INDEX IF NOT EXISTS lesson_compensations_student_idx
  ON lesson_compensations (student_id);

ALTER TABLE lesson_compensations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_compensations_admin_select" ON lesson_compensations;
DROP POLICY IF EXISTS "lesson_compensations_admin_write" ON lesson_compensations;
DROP POLICY IF EXISTS "lesson_compensations_student_insert" ON lesson_compensations;
DROP POLICY IF EXISTS "lesson_compensations_student_select_own" ON lesson_compensations;

CREATE POLICY "lesson_compensations_admin_select"
ON lesson_compensations
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "lesson_compensations_admin_write"
ON lesson_compensations
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

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
