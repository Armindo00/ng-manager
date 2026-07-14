-- =============================================================================
-- NG Manager - Remover emails duplicados em app_users antes do índice único
-- Mantém 1 registo por email (prioridade: admin > coach > aluno com student_id)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM app_users
    GROUP BY lower(trim(email))
    HAVING COUNT(*) > 1
  ) THEN
    RETURN;
  END IF;

  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY lower(trim(email))
        ORDER BY
          CASE role
            WHEN 'admin' THEN 0
            WHEN 'coach' THEN 1
            ELSE 2
          END,
          CASE WHEN student_id IS NOT NULL THEN 0 ELSE 1 END,
          CASE WHEN COALESCE(blocked, false) = false THEN 0 ELSE 1 END,
          id
      ) AS rn
    FROM app_users
  )
  DELETE FROM app_users AS target
  USING ranked
  WHERE target.id = ranked.id
    AND ranked.rn > 1;
END $$;
