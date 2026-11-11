-- =============================================================================
-- Inventário: permitir estado (bom/razoável/mau) em todos os materiais
-- =============================================================================

UPDATE inventory_items
SET condition = 'good'
WHERE condition IS NULL;

DROP INDEX IF EXISTS inventory_items_simple_unique;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_simple_unique
  ON inventory_items (item_type, COALESCE(condition, ''))
  WHERE item_type IN (
    'leash',
    'lycra_coach',
    'lycra_student',
    'flags',
    'medical_kit'
  );
