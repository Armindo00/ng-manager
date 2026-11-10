-- =============================================================================
-- NG Manager - Grupos fixos editáveis (escala semanal)
-- =============================================================================

CREATE TABLE IF NOT EXISTS fixed_trainings (
  id text PRIMARY KEY,
  weekday text NOT NULL CHECK (
    weekday IN (
      'segunda',
      'terca',
      'quarta',
      'quinta',
      'sexta',
      'sabado',
      'domingo'
    )
  ),
  title text NOT NULL,
  students text[] NOT NULL DEFAULT '{}',
  coach_name text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fixed_trainings_weekday_idx
  ON fixed_trainings (weekday, sort_order, title);

ALTER TABLE fixed_trainings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fixed_trainings_select" ON fixed_trainings;
DROP POLICY IF EXISTS "fixed_trainings_admin_write" ON fixed_trainings;

CREATE POLICY "fixed_trainings_select"
ON fixed_trainings
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.is_coach()
);

CREATE POLICY "fixed_trainings_admin_write"
ON fixed_trainings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
