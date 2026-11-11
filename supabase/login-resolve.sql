-- Resolve login name/email -> auth email (admin and coaches)
CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_login text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text := lower(trim(coalesce(p_login, '')));
  found text;
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  -- Exact email
  IF position('@' in v) > 0 THEN
    SELECT email INTO found
    FROM app_users
    WHERE lower(email) = v
    LIMIT 1;
    RETURN found;
  END IF;

  -- Display name (prefer admin if duplicate names ever exist)
  SELECT email INTO found
  FROM app_users
  WHERE lower(trim(name)) = v
    AND role IN ('admin', 'coach')
  ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END
  LIMIT 1;

  RETURN found;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated;
