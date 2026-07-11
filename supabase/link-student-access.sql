-- =============================================================================
-- NG Manager - Ligar manualmente um aluno a uma conta Auth existente
-- Usar quando "Criar acesso" falha mas o user já existe em auth.users
-- =============================================================================

-- 1) Ver estado atual do Miguel
SELECT
  s.id AS student_id,
  s.name,
  s.email AS student_email,
  au.id AS auth_id,
  au.email AS auth_email,
  ap.id AS app_user_id
FROM students s
LEFT JOIN auth.users au ON lower(au.email) = lower(s.email)
LEFT JOIN app_users ap ON ap.student_id::text = s.id::text
WHERE s.name ILIKE '%miguel%';

-- 2) Criar ligação em app_users (só se auth_id existir e app_user_id for NULL)
INSERT INTO app_users (id, name, email, role, student_id, blocked)
SELECT
  au.id,
  s.name,
  lower(trim(s.email)),
  'student',
  s.id,
  false
FROM students s
JOIN auth.users au ON lower(au.email) = lower(trim(s.email))
LEFT JOIN app_users ap ON ap.student_id::text = s.id::text
WHERE s.name ILIKE '%miguel%'
  AND ap.id IS NULL;
