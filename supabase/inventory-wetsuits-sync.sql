-- =============================================================================
-- Inventário de fatos — sync com a folha da escola
-- Tamanhos: 6, 8, 10, 12, 14, S, M, L
-- Total = Stock + Novo - Out (sem coluna de estado → condition = good)
-- =============================================================================

DELETE FROM inventory_items WHERE item_type = 'wetsuit';

INSERT INTO inventory_items (item_type, size, condition, quantity, notes)
VALUES
  ('wetsuit', '6', 'good', 18, 'Sync folha fatos (11 stock + 7 novo)'),
  ('wetsuit', '8', 'good', 19, 'Sync folha fatos'),
  ('wetsuit', '10', 'good', 12, 'Sync folha fatos'),
  ('wetsuit', '12', 'good', 16, 'Sync folha fatos'),
  ('wetsuit', '14', 'good', 13, 'Sync folha fatos'),
  ('wetsuit', 'S', 'good', 10, 'Sync folha fatos'),
  ('wetsuit', 'M', 'good', 6, 'Sync folha fatos'),
  ('wetsuit', 'L', 'good', 5, 'Sync folha fatos');
