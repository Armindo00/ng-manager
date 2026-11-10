-- =============================================================================
-- NG Manager - Fatos de surf também por estado (bom / razoável / mau)
-- =============================================================================

DROP INDEX IF EXISTS inventory_items_wetsuit_unique;

-- Migrar factos sem estado para "good"
UPDATE inventory_items
SET condition = 'good'
WHERE item_type = 'wetsuit'
  AND condition IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_wetsuit_unique
  ON inventory_items (item_type, COALESCE(size, ''), COALESCE(condition, ''))
  WHERE item_type = 'wetsuit';
