-- =============================================================================
-- NG Manager - Schema baseline (idempotente para BD existente ou nova)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT '',
  monthly_limit integer NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  pickup text NOT NULL DEFAULT '',
  main_coach text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'coach', 'admin')),
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  blocked boolean NOT NULL DEFAULT false,
  must_change_password boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique
  ON app_users (lower(trim(email)));

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE RESTRICT,
  coach_name text NOT NULL DEFAULT '',
  student_ids uuid[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  time text NOT NULL DEFAULT '',
  beach text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finished')),
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  group_name text,
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE RESTRICT,
  coach_name text NOT NULL DEFAULT '',
  van text NOT NULL DEFAULT '',
  pickup_time text NOT NULL DEFAULT '',
  coach_pickups jsonb NOT NULL DEFAULT '[]'::jsonb,
  coach_notes text NOT NULL DEFAULT '',
  booked_student_ids uuid[] NOT NULL DEFAULT '{}',
  present_student_ids uuid[] NOT NULL DEFAULT '{}',
  responses jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS lessons_date_idx ON lessons (date);
CREATE INDEX IF NOT EXISTS lessons_group_id_idx ON lessons (group_id);
CREATE INDEX IF NOT EXISTS lessons_coach_id_idx ON lessons (coach_id);

CREATE TABLE IF NOT EXISTS evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year >= 2020),
  effort integer NOT NULL DEFAULT 0,
  attendance integer NOT NULL DEFAULT 0,
  technical_goal text NOT NULL DEFAULT '',
  goal_result text NOT NULL DEFAULT 'continue' CHECK (
    goal_result IN ('completed', 'progress', 'continue')
  ),
  coach_comment text NOT NULL DEFAULT '',
  next_goal text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year >= 2020),
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'cancelled')
  ),
  payment_date date,
  payment_method text,
  notes text
);

CREATE TABLE IF NOT EXISTS recurring_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  group_name text NOT NULL DEFAULT '',
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  coach_name text NOT NULL DEFAULT '',
  week_day text NOT NULL,
  van text NOT NULL DEFAULT '',
  repeat_until date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  default_time text NOT NULL DEFAULT '',
  default_beach text NOT NULL DEFAULT 'A definir'
);

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

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (
    item_type IN (
      'board',
      'wetsuit',
      'leash',
      'lycra_coach',
      'lycra_student',
      'flags',
      'medical_kit'
    )
  ),
  size text,
  condition text CHECK (condition IS NULL OR condition IN ('good', 'fair', 'bad')),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
