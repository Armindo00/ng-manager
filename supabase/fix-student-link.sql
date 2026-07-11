-- =============================================================================
-- NG Manager - Corrigir ligação aluno (app_users.student_id)
-- Executar no Supabase SQL Editor quando o aluno vê "Aluno não encontrado"
-- =============================================================================

-- 1) Ver estado
SELECT
  ap.id AS app_user_id,
  ap.name,
  ap.email,
  ap.role,
  ap.student_id,
  s.id AS students_id,
  s.email AS student_email,
  CASE
    WHEN ap.student_id IS NULL THEN 'student_id em falta'
    WHEN s.id IS NULL THEN 'student_id inválido'
    WHEN ap.student_id::text <> s.id::text THEN 'student_id desalinhado'
    ELSE 'OK'
  END AS estado
FROM app_users ap
LEFT JOIN students s ON s.id::text = ap.student_id::text
WHERE ap.role = 'student'
ORDER BY ap.name;

-- 2) Reparar por email (exemplo Miguel)
UPDATE app_users ap
SET student_id = s.id
FROM students s
WHERE ap.role = 'student'
  AND lower(ap.email) = lower(s.email)
  AND (ap.student_id IS NULL OR ap.student_id::text <> s.id::text);
