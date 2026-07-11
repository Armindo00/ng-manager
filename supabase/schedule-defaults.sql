-- =============================================================================
-- NG Manager - Campos opcionais no horário semanal
-- Executar no Supabase SQL Editor (opcional mas recomendado)
-- =============================================================================

ALTER TABLE recurring_trainings
ADD COLUMN IF NOT EXISTS default_time text NOT NULL DEFAULT '';

ALTER TABLE recurring_trainings
ADD COLUMN IF NOT EXISTS default_beach text NOT NULL DEFAULT 'A definir';
