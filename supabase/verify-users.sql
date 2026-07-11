-- =============================================================================
-- NG Manager - Verificar ligações app_users / Auth / coaches / students
-- Executar no Supabase SQL Editor (como owner do projeto)
-- =============================================================================

-- 1) Utilizadores na app
SELECT
  id,
  name,
  email,
  role,
  student_id
FROM app_users
ORDER BY role, name;

-- 2) Utilizadores no Supabase Auth
SELECT
  id AS auth_id,
  email,
  created_at
FROM auth.users
ORDER BY email;

-- 3) Emails em Auth mas sem registo em app_users
SELECT
  au.email AS auth_email
FROM auth.users au
LEFT JOIN app_users ap ON lower(ap.email) = lower(au.email)
WHERE ap.id IS NULL;

-- 4) Registos em app_users sem conta Auth
SELECT
  ap.email AS app_email,
  ap.role
FROM app_users ap
LEFT JOIN auth.users au ON lower(au.email) = lower(ap.email)
WHERE au.id IS NULL;

-- 5) Treinadores com id desalinhado
SELECT
  ap.id AS app_user_id,
  ap.name,
  ap.email,
  c.id AS coach_id,
  CASE
    WHEN c.id IS NULL THEN 'FALTA em coaches'
    WHEN ap.id::text <> c.id::text THEN 'ID diferente'
    ELSE 'OK'
  END AS estado
FROM app_users ap
LEFT JOIN coaches c ON c.id::text = ap.id::text
WHERE ap.role = 'coach'
ORDER BY ap.name;

-- 6) Alunos com student_id inválido
SELECT
  ap.id AS app_user_id,
  ap.name,
  ap.email,
  ap.student_id,
  s.id AS students_id,
  CASE
    WHEN ap.student_id IS NULL THEN 'student_id em falta'
    WHEN s.id IS NULL THEN 'student_id não existe em students'
    ELSE 'OK'
  END AS estado
FROM app_users ap
LEFT JOIN students s ON s.id::text = ap.student_id::text
WHERE ap.role = 'student'
ORDER BY ap.name;

-- 7) Resumo final
SELECT
  'app_users' AS tabela,
  COUNT(*)::text AS total
FROM app_users
UNION ALL
SELECT 'auth.users', COUNT(*)::text FROM auth.users
UNION ALL
SELECT 'coaches', COUNT(*)::text FROM coaches
UNION ALL
SELECT 'students', COUNT(*)::text FROM students;
