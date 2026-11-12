-- Tipo de faturação do aluno: mensalidade ou pack de treinos.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'monthly';

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS pack_size integer NOT NULL DEFAULT 0;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS pack_price numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS pack_remaining integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_billing_type_check'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_billing_type_check
      CHECK (billing_type IN ('monthly', 'pack'));
  END IF;
END $$;
