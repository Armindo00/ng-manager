-- =============================================================================
-- NG Manager - Corrigir comparações de email no RLS (case-insensitive)
-- Executar no Supabase SQL Editor
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(auth.jwt() ->> 'email');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_users
    WHERE lower(email) = public.auth_email()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_users
    WHERE lower(email) = public.auth_email()
      AND role = 'coach'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_users
    WHERE lower(email) = public.auth_email()
      AND role = 'student'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id::text
  FROM app_users
  WHERE lower(email) = public.auth_email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_id::text
  FROM app_users
  WHERE lower(email) = public.auth_email()
    AND role = 'student'
  LIMIT 1;
$$;
