-- Valor mensal esperado da mensalidade por aluno (pagamentos).
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS monthly_fee numeric(10, 2) NOT NULL DEFAULT 0;
