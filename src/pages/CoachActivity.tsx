import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student, User } from "../types";
import type { VideoAnalysisSession } from "../types/videoAnalysis";
import { getLessons } from "../services/lessonsService";
import { getStudents } from "../services/studentsService";
import {
  addVideoAnalysisSession,
  deleteVideoAnalysisSession,
  getVideoAnalysisSessions,
} from "../services/videoAnalysisService";
import { resolveCoachId } from "../utils/coachAccess";
import {
  countCoachMonthlyActivity,
  shiftMonth,
} from "../utils/coachMonthlyActivity";
import {
  formatDisplayDate,
  formatMonthYear,
  getCurrentMonthYear,
  getTodayDate,
} from "../utils/dateUtils";
import FormField from "../components/FormField";

type Props = {
  user: User;
};

function CoachActivity({ user }: Props) {
  const current = getCurrentMonthYear();
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [videoSessions, setVideoSessions] = useState<VideoAnalysisSession[]>(
    []
  );
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState(user.name);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(getTodayDate());
  const [notes, setNotes] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    loadData();
  }, [user.id, user.role, user.name]);

  async function loadData() {
    try {
      setLoading(true);
      const [lessonsData, videoData, studentsData, resolvedCoachId] =
        await Promise.all([
          getLessons(),
          getVideoAnalysisSessions(),
          getStudents(),
          resolveCoachId(user),
        ]);

      setLessons(lessonsData);
      setVideoSessions(videoData);
      setStudents(studentsData);
      setCoachId(resolvedCoachId);
      setCoachName(user.name);
    } catch (error) {
      console.error(error);
      toast.error(
        "Erro ao carregar atividade. Confirma se a tabela video_analysis_sessions existe no Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    if (!coachId) {
      return {
        coachId: "",
        coachName,
        waterSessions: 0,
        videoSessions: 0,
        total: 0,
      };
    }

    return countCoachMonthlyActivity({
      coachId,
      coachName,
      lessons,
      videoSessions,
      month,
      year,
    });
  }, [coachId, coachName, lessons, videoSessions, month, year]);

  const monthVideos = useMemo(
    () =>
      videoSessions
        .filter((session) => {
          if (!coachId || session.coachId !== coachId) return false;
          const [y, m] = session.date.split("-").map(Number);
          return y === year && m === month;
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [videoSessions, coachId, month, year]
  );

  const selectableStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    return students
      .filter((student) =>
        term ? student.name.toLowerCase().includes(term) : true
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }, [students, studentSearch]);

  const studentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students) {
      map.set(student.id, student.name);
    }
    return map;
  }, [students]);

  function changeMonth(delta: number) {
    const next = shiftMonth(month, year, delta);
    setMonth(next.month);
    setYear(next.year);
  }

  function toggleStudent(studentId: string) {
    setStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  function formatStudentNames(ids: string[]) {
    if (ids.length === 0) return "Sem alunos";
    return ids
      .map((id) => studentNameById.get(id) || "Aluno")
      .join(", ");
  }

  async function saveVideoSession() {
    if (!coachId) {
      toast.error("Conta de treinador não encontrada.");
      return;
    }

    if (!date) {
      toast.error("Escolhe a data da videoanálise.");
      return;
    }

    if (studentIds.length === 0) {
      toast.error("Escolhe pelo menos um aluno da videoanálise.");
      return;
    }

    try {
      setSaving(true);
      const session: Omit<VideoAnalysisSession, "createdAt"> = {
        id: crypto.randomUUID(),
        coachId,
        coachName,
        date,
        notes: notes.trim(),
        studentIds,
      };

      await addVideoAnalysisSession(session);
      setVideoSessions((currentSessions) => [
        { ...session, createdAt: new Date().toISOString() },
        ...currentSessions,
      ]);
      setNotes("");
      setStudentIds([]);
      setStudentSearch("");
      toast.success("Videoanálise registada.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registar videoanálise.");
    } finally {
      setSaving(false);
    }
  }

  async function removeVideoSession(id: string) {
    try {
      await deleteVideoAnalysisSession(id);
      setVideoSessions((currentSessions) =>
        currentSessions.filter((session) => session.id !== id)
      );
      toast.success("Videoanálise removida.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover videoanálise.");
    }
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Atividade</p>
        <h1 className="page-title">Os meus treinos</h1>
        <p className="page-description">
          Totais do mês: treinos na água + videoanálises registadas.
        </p>
      </header>

      <div className="form-row" style={{ alignItems: "center", gap: "0.75rem" }}>
        <button type="button" className="compact-btn" onClick={() => changeMonth(-1)}>
          ←
        </button>
        <strong style={{ textTransform: "capitalize" }}>
          {formatMonthYear(month, year)}
        </strong>
        <button type="button" className="compact-btn" onClick={() => changeMonth(1)}>
          →
        </button>
      </div>

      {loading ? (
        <p className="muted">A carregar...</p>
      ) : !coachId ? (
        <p className="muted">
          Não foi possível ligar esta conta a um treinador. Contacta o admin.
        </p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Treinos (água)</span>
              <strong className="stat-number">{stats.waterSessions}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Videoanálises</span>
              <strong className="stat-number">{stats.videoSessions}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Total no mês</span>
              <strong className="stat-number">{stats.total}</strong>
            </div>
          </div>

          <div className="card section-card">
            <h2>Registar videoanálise</h2>
            <p className="muted">
              Usa isto para sessões de videoanálise que não estão no calendário
              de treinos. Indica os alunos que participaram.
            </p>

            <div className="form-fields-grid">
              <FormField label="Data">
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </FormField>

              <FormField label="Notas (opcional)">
                <input
                  type="text"
                  placeholder="Ex: grupo manhã, foco em bottom turn"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </FormField>
            </div>

            <label className="field-label">
              Quem esteve na videoanálise
              <input
                className="search-input"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Pesquisar aluno..."
              />
            </label>

            <div className="coach-extra-student-picker">
              {selectableStudents.length === 0 ? (
                <p className="muted">Sem alunos encontrados.</p>
              ) : (
                selectableStudents.map((student) => {
                  const selected = studentIds.includes(student.id);
                  return (
                    <button
                      type="button"
                      key={student.id}
                      className={`coach-extra-student-option${
                        selected ? " selected" : ""
                      }`}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <span>{student.name}</span>
                      <strong>{selected ? "Foi" : "Selecionar"}</strong>
                    </button>
                  );
                })
              )}
            </div>

            <p className="muted">{studentIds.length} aluno(s) selecionado(s)</p>

            <div className="form-fields-actions">
              <button
                type="button"
                className="primary-btn"
                disabled={saving}
                onClick={saveVideoSession}
              >
                {saving ? "A guardar..." : "Adicionar videoanálise"}
              </button>
            </div>
          </div>

          <div className="card section-card">
            <h2>Videoanálises deste mês</h2>

            {monthVideos.length === 0 ? (
              <p className="muted">Ainda não há videoanálises neste mês.</p>
            ) : (
              <div className="coach-session-list">
                {monthVideos.map((session) => (
                  <div className="coach-session-card" key={session.id}>
                    <div>
                      <strong>{formatDisplayDate(session.date)}</strong>
                      <p className="muted">
                        {formatStudentNames(session.studentIds || [])}
                      </p>
                      <p className="muted">
                        {session.notes || "Sem notas"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="danger-btn compact-btn"
                      onClick={() => removeVideoSession(session.id)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CoachActivity;
