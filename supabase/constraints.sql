-- =============================================================================
-- NG Manager - Constraints e validação de IDs
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS payments_student_month_year_unique
  ON payments (student_id, month, year);

CREATE UNIQUE INDEX IF NOT EXISTS evaluations_student_coach_month_year_unique
  ON evaluations (student_id, coach_id, month, year);

CREATE OR REPLACE FUNCTION public.validate_app_user_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'coach' AND NOT EXISTS (
    SELECT 1 FROM coaches WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Treinador: app_users.id deve coincidir com coaches.id (%)', NEW.id;
  END IF;

  IF NEW.role = 'student' AND NEW.student_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM students WHERE id = NEW.student_id
  ) THEN
    RAISE EXCEPTION 'Aluno: student_id inválido (%)', NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_users_validate_links ON app_users;

CREATE TRIGGER app_users_validate_links
BEFORE INSERT OR UPDATE ON app_users
FOR EACH ROW
EXECUTE FUNCTION public.validate_app_user_links();
