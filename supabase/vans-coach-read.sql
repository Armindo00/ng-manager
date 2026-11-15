-- Treinadores podem ver carrinhas e tarefas (avisos / prazos).
-- Escrita continua só para admin.

DROP POLICY IF EXISTS "vans_coach_select" ON vans;
CREATE POLICY "vans_coach_select"
ON vans
FOR SELECT
TO authenticated
USING (public.is_coach());

DROP POLICY IF EXISTS "van_tasks_coach_select" ON van_tasks;
CREATE POLICY "van_tasks_coach_select"
ON van_tasks
FOR SELECT
TO authenticated
USING (public.is_coach());
