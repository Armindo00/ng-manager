-- =============================================================================
-- Inventário: chaves da carrinha + suplentes
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

DROP INDEX IF EXISTS inventory_items_simple_unique;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_simple_unique
  ON inventory_items (item_type, COALESCE(condition, ''))
  WHERE item_type IN (
    'leash',
    'lycra_coach',
    'lycra_student',
    'flags',
    'medical_kit',
    'van_keys',
    'spares'
  );

INSERT INTO inventory_items (item_type, size, condition, quantity, notes)
SELECT 'van_keys', NULL, 'good', 0, 'Chaves da carrinha'
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items WHERE item_type = 'van_keys'
);

INSERT INTO inventory_items (item_type, size, condition, quantity, notes)
SELECT 'spares', NULL, 'good', 0, 'Suplentes'
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items WHERE item_type = 'spares'
);
