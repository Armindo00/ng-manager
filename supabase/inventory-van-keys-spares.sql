-- =============================================================================
-- Inventário: chaves por carrinha + suplentes
-- size em van_keys = id da carrinha (vans.id)
-- =============================================================================

ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_item_type_check;

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_item_type_check
  CHECK (
    item_type IN (
      'board',
      'wetsuit',
      'leash',
      'lycra_coach',
      'lycra_student',
      'flags',
      'medical_kit',
      'van_keys',
      'spares'
    )
  );

-- Remove linha genérica antiga (sem carrinha associada).
DELETE FROM inventory_items
WHERE item_type = 'van_keys'
  AND (size IS NULL OR trim(size) = '');

DROP INDEX IF EXISTS inventory_items_simple_unique;
DROP INDEX IF EXISTS inventory_items_van_keys_unique;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_simple_unique
  ON inventory_items (item_type, COALESCE(condition, ''))
  WHERE item_type IN (
    'leash',
    'lycra_coach',
    'lycra_student',
    'flags',
    'medical_kit',
    'spares'
  );

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_van_keys_unique
  ON inventory_items (item_type, COALESCE(size, ''), COALESCE(condition, ''))
  WHERE item_type = 'van_keys';

INSERT INTO inventory_items (item_type, size, condition, quantity, notes)
SELECT 'spares', NULL, 'good', 0, 'Suplentes'
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items WHERE item_type = 'spares'
);
