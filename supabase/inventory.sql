-- =============================================================================
-- NG Manager - Inventário de material da escola
-- Executar no Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (
    item_type IN (
      'board',
      'wetsuit',
      'leash',
      'lycra_coach',
      'lycra_student',
      'flags',
      'medical_kit'
    )
  ),
  size text,
  condition text CHECK (condition IS NULL OR condition IN ('good', 'fair', 'bad')),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_board_unique
  ON inventory_items (item_type, COALESCE(size, ''), COALESCE(condition, ''))
  WHERE item_type = 'board';

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_wetsuit_unique
  ON inventory_items (item_type, COALESCE(size, ''))
  WHERE item_type = 'wetsuit';

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_simple_unique
  ON inventory_items (item_type)
  WHERE item_type IN ('leash', 'lycra_coach', 'lycra_student', 'flags', 'medical_kit');

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_admin_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_admin_write" ON inventory_items;

CREATE POLICY "inventory_admin_select"
ON inventory_items
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "inventory_admin_write"
ON inventory_items
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
