-- =============================================================================
-- Inventário de material (leash/licras/bandeiras/kits) — sync folha mar./13
-- Streps → leash | Licras pretas → lycra_coach | Licras brancas → lycra_student
-- Total = Quantidade + Novo - Out
-- =============================================================================

DELETE FROM inventory_items
WHERE item_type IN (
  'leash',
  'lycra_coach',
  'lycra_student',
  'flags',
  'medical_kit',
  'spares'
);

INSERT INTO inventory_items (item_type, size, condition, quantity, notes)
VALUES
  ('leash', NULL, 'good', 31, 'Sync folha material mar./13 (Streps)'),
  ('lycra_coach', NULL, 'good', 8, 'Sync folha material mar./13 (Licras pretas)'),
  ('lycra_student', NULL, 'good', 34, 'Sync folha material mar./13 (Licras brancas 36-2 out)'),
  ('flags', NULL, 'good', 2, 'Sync folha material mar./13 (Bandeiras)'),
  ('medical_kit', NULL, 'good', 2, 'Sync folha material mar./13 (Kits 1+1 novo)'),
  ('spares', NULL, 'good', 0, 'Suplentes');

-- Chaves: uma linha por carrinha registada (size = vans.id).
DELETE FROM inventory_items WHERE item_type = 'van_keys';

INSERT INTO inventory_items (item_type, size, condition, quantity, notes)
SELECT
  'van_keys',
  v.id::text,
  'good',
  0,
  'Chave ' || coalesce(nullif(trim(v.name), ''), 'carrinha')
FROM vans v;
