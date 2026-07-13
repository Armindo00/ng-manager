-- =============================================================================
-- NG Manager - Coluna blocked em app_users para estado de acesso
-- Executar no Supabase SQL Editor
-- =============================================================================

ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
