-- =============================================================================
-- Inventário de pranchas — sync com a folha da escola (contagens mar./13)
-- Novo → good | Médio Estado → fair | Mau Estado → bad | Out ignorado (0)
-- =============================================================================

DELETE FROM inventory_items WHERE item_type = 'board';

INSERT INTO inventory_items (item_type, size, condition, quantity, notes)
VALUES
  ('board', $$8'6"$$, 'fair', 2, 'Sync folha pranchas mar./13'),
  ('board', $$8'0"$$, 'fair', 6, 'Sync folha pranchas mar./13'),
  ('board', $$6'8"$$, 'fair', 2, 'Sync folha pranchas mar./13'),
  ('board', $$6'6"$$, 'fair', 6, 'Sync folha pranchas mar./13'),
  ('board', $$6'6"$$, 'bad', 1, 'Sync folha pranchas mar./13'),
  ('board', $$6'4"$$, 'fair', 1, 'Sync folha pranchas mar./13'),
  ('board', $$6'0"$$, 'fair', 3, 'Sync folha pranchas mar./13'),
  ('board', $$6'0"$$, 'bad', 1, 'Sync folha pranchas mar./13'),
  ('board', 'Fibra', 'fair', 5, 'Sync folha pranchas mar./13');
