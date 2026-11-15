-- =============================================================================
-- Videoanálise: alunos participantes (uuid[])
-- =============================================================================

ALTER TABLE video_analysis_sessions
  ADD COLUMN IF NOT EXISTS student_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN video_analysis_sessions.student_ids IS
  'Alunos que participaram nesta sessão de videoanálise';
