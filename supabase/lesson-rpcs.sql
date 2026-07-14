-- =============================================================================
-- NG Manager - RPCs com escopo de coluna para lessons
-- Substitui UPDATE full-row para alunos (respostas a treinos)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_lesson_response(
  p_lesson_id uuid,
  p_response jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_id_text text := public.current_student_id();
  student_id_value uuid;
  current_responses jsonb;
  next_responses jsonb;
  response_student_id text;
BEGIN
  IF NOT public.is_student() THEN
    RAISE EXCEPTION 'Apenas alunos podem responder a treinos.';
  END IF;

  IF student_id_text IS NULL OR student_id_text = '' THEN
    RAISE EXCEPTION 'Conta de aluno sem student_id associado.';
  END IF;

  student_id_value := student_id_text::uuid;
  response_student_id := COALESCE(p_response ->> 'studentId', '');

  IF response_student_id = '' OR response_student_id <> student_id_text THEN
    RAISE EXCEPTION 'A resposta deve pertencer ao aluno autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.id = p_lesson_id
      AND l.status = 'published'
      AND public.student_booked_in_lesson(l.booked_student_ids, student_id_text)
  ) THEN
    RAISE EXCEPTION 'Treino não encontrado ou sem permissão.';
  END IF;

  SELECT COALESCE(l.responses, '[]'::jsonb)
  INTO current_responses
  FROM lessons l
  WHERE l.id = p_lesson_id
  FOR UPDATE;

  SELECT COALESCE(
    jsonb_agg(item ORDER BY ord),
    '[]'::jsonb
  )
  INTO next_responses
  FROM (
    SELECT item, ord
    FROM jsonb_array_elements(current_responses) WITH ORDINALITY AS t(item, ord)
    WHERE COALESCE(item ->> 'studentId', '') <> student_id_text
  ) filtered;

  next_responses := COALESCE(next_responses, '[]'::jsonb) || jsonb_build_array(p_response);

  UPDATE lessons
  SET responses = next_responses
  WHERE id = p_lesson_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_lesson_response(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_lesson_response(uuid, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
