-- =============================================================================
-- NG Manager - Gestão de carrinhas
-- Executar no Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS vans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plate text NOT NULL,
  brand text,
  model text,
  year text,
  capacity text,
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vans_plate_unique
  ON vans (lower(trim(plate)));

CREATE TABLE IF NOT EXISTS van_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  van_id uuid NOT NULL REFERENCES vans(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_type text NOT NULL CHECK (
    task_type IN ('inspection', 'revision', 'maintenance', 'insurance', 'other')
  ),
  due_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS van_tasks_due_date_idx
  ON van_tasks (due_date);

CREATE INDEX IF NOT EXISTS van_tasks_van_id_idx
  ON van_tasks (van_id);

ALTER TABLE vans ENABLE ROW LEVEL SECURITY;
ALTER TABLE van_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vans_admin_select" ON vans;
DROP POLICY IF EXISTS "vans_admin_write" ON vans;
DROP POLICY IF EXISTS "van_tasks_admin_select" ON van_tasks;
DROP POLICY IF EXISTS "van_tasks_admin_write" ON van_tasks;

CREATE POLICY "vans_admin_select"
ON vans
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "vans_admin_write"
ON vans
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "van_tasks_admin_select"
ON van_tasks
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "van_tasks_admin_write"
ON van_tasks
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
