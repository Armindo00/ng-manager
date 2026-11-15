-- Plano do preçário + extras mensais no aluno.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS plan_id text NOT NULL DEFAULT '';

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS includes_transport boolean NOT NULL DEFAULT false;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS wetsuit_rental boolean NOT NULL DEFAULT false;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS board_storage boolean NOT NULL DEFAULT false;
