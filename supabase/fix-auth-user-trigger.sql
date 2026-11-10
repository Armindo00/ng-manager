-- =============================================================================
-- NG Manager - Corrigir trigger auth → app_users
-- =============================================================================
-- O trigger antigo inseria app_users com role=coach sem id=auth.users.id e
-- sem coaches.id correspondente, o que fazia falhar createUser com
-- "Database error creating new user".
-- Treinadores/admins são provisionados pela Edge Function admin-student-auth.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(NEW.raw_user_meta_data->>'role', 'student') IN ('coach', 'admin') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.app_users (
    id,
    name,
    email,
    role,
    student_id
  )
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'student',
    NULL
  )
  ON CONFLICT (email) DO NOTHING;

  RETURN NEW;
END;
$function$;
