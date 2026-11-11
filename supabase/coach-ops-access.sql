-- =============================================================================
-- Treinadores: inventário, avaliações e alunos (leitura operacional)
-- =============================================================================

-- Inventário: ver e editar
DROP POLICY IF EXISTS "inventory_admin_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_admin_write" ON inventory_items;
DROP POLICY IF EXISTS "inventory_coach_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_coach_write" ON inventory_items;

CREATE POLICY "inventory_staff_select"
ON inventory_items
FOR SELECT
TO authenticated
USING (public.is_admin() OR public.is_coach());

CREATE POLICY "inventory_staff_write"
ON inventory_items
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_coach())
WITH CHECK (public.is_admin() OR public.is_coach());

-- Alunos: treinadores precisam de ver a lista para avaliações/compensações
DROP POLICY IF EXISTS "students_coach_select_all" ON students;

CREATE POLICY "students_coach_select_all"
ON students
FOR SELECT
TO authenticated
USING (public.is_coach());

-- Avaliações: ver todas as da escola; escrever as próprias
DROP POLICY IF EXISTS "evaluations_coach_select_all" ON evaluations;
DROP POLICY IF EXISTS "evaluations_coach_write" ON evaluations;
DROP POLICY IF EXISTS "evaluations_coach_update" ON evaluations;
DROP POLICY IF EXISTS "evaluations_coach_delete" ON evaluations;

CREATE POLICY "evaluations_coach_select_all"
ON evaluations
FOR SELECT
TO authenticated
USING (public.is_coach());

CREATE POLICY "evaluations_coach_write"
ON evaluations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_coach()
  AND evaluations.coach_id::text = public.current_app_user_id()
);

CREATE POLICY "evaluations_coach_update"
ON evaluations
FOR UPDATE
TO authenticated
USING (
  public.is_coach()
  AND evaluations.coach_id::text = public.current_app_user_id()
)
WITH CHECK (
  public.is_coach()
  AND evaluations.coach_id::text = public.current_app_user_id()
);

CREATE POLICY "evaluations_coach_delete"
ON evaluations
FOR DELETE
TO authenticated
USING (
  public.is_coach()
  AND evaluations.coach_id::text = public.current_app_user_id()
);
