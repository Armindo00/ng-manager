-- =============================================================================
-- Avaliações: estado, partilha pública e envio ao atleta
-- =============================================================================

ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

ALTER TABLE evaluations
  DROP CONSTRAINT IF EXISTS evaluations_status_check;

ALTER TABLE evaluations
  ADD CONSTRAINT evaluations_status_check
  CHECK (status IN ('draft', 'finalized', 'sent'));

CREATE UNIQUE INDEX IF NOT EXISTS evaluations_share_token_unique
  ON evaluations (share_token)
  WHERE share_token IS NOT NULL;

-- Leitura pública por token (só avaliações finalizadas/enviadas)
CREATE OR REPLACE FUNCTION public.get_shared_evaluation(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id', e.id,
    'studentName', s.name,
    'coachName', coalesce(c.name, au.name, 'Treinador'),
    'month', e.month,
    'year', e.year,
    'effort', e.effort,
    'attendance', e.attendance,
    'technicalGoal', e.technical_goal,
    'goalResult', e.goal_result,
    'coachComment', e.coach_comment,
    'nextGoal', e.next_goal,
    'status', e.status,
    'finalizedAt', e.finalized_at,
    'sentAt', e.sent_at
  )
  INTO result
  FROM evaluations e
  JOIN students s ON s.id = e.student_id
  LEFT JOIN coaches c ON c.id::text = e.coach_id::text
  LEFT JOIN app_users au ON au.id::text = e.coach_id::text
  WHERE e.share_token = trim(p_token)
    AND e.status IN ('finalized', 'sent')
  LIMIT 1;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_evaluation(text) TO anon, authenticated;
