-- =============================================================================
-- NG Manager - Garantir coluna active em recurring_trainings
-- Executar no Supabase SQL Editor se guardar horário falhar por coluna active
-- =============================================================================

ALTER TABLE recurring_trainings
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
