import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student, User } from "../types";
import type { FixedTraining } from "../data/fixedTrainings";
import { getStudents } from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import { ensureFixedTrainingsSeeded } from "../services/fixedTrainingsService";
import Modal from "../components/Modal";
import CoachAttendancePanel from "../components/CoachAttendancePanel";
import { resolveCoachId } from "../utils/coachAccess";
import { formatSessionCoaches } from "../utils/sessionCoaches";
import {
  formatDisplayDate,
  getTodayDate,
  getWeekdayKey,
  getWeekdayLabel,
} from "../utils/dateUtils";

type Props = {
  user: User;
};

const WEEKDAY_ORDER = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
] as const;

const WEEKDAY_TITLE: Record<(typeof WEEKDAY_ORDER)[number], string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo",
};

function CoachArea({ user }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [fixedTrainings, setFixedTrainings] = useState<FixedTraining[]>([]);

  const today = getTodayDate();
  const todayKey = getWeekdayKey(today);

  useEffect(() => {
    loadData();
  }, [user.id, user.role, user.name]);

  async function loadData() {
    try {
      setLoading(true);

      const [studentsData, lessonsData, trainingsData, resolvedCoachId] =
        await Promise.all([
          getStudents(),
          getLessons(),
          ensureFixedTrainingsSeeded(),
          resolveCoachId(user),
        ]);

      setCoachId(resolvedCoachId);
      setStudents(studentsData);
      setFixedTrainings(trainingsData);
      setLessons(
        lessonsData
          .filter((lesson) => lesson.status !== "draft")
          .sort((a, b) =>
            `${b.date} ${b.time || ""}`.localeCompare(
              `${a.date} ${a.time || ""}`
            )
          )
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar treinos.");
    } finally {
      setLoading(false);
    }
  }

  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  const recentSessions = useMemo(
    () => lessons.filter((lesson) => Boolean(lesson.groupName)).slice(0, 12),
    [lessons]
  );

  if (loading) {
    return <p className="muted">A carregar treinos...</p>;
  }

  if (!coachId) {
    return (
      <p>
        Não foi possível ligar esta conta a um treinador. Garante que existes
        na lista de treinadores.
      </p>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Escala semanal</p>
        <h1 className="page-title">Grupos fixos</h1>
        <p className="page-description">
          Consulta a escala completa. Para marcar presenças, usa{" "}
          <strong>Hoje</strong> ({getWeekdayLabel(today)}).
        </p>
      </header>

      <section className="card section-card coach-week-schedule">
        <div className="admin-section-heading">
          <div>
            <span className="admin-section-kicker">Semana</span>
            <h2>Escala por dia</h2>
          </div>
        </div>

        <div className="coach-week-days">
          {WEEKDAY_ORDER.map((weekday) => {
            const groups = fixedTrainings.filter(
              (group) => group.weekday === weekday
            );
            if (groups.length === 0) return null;

            return (
              <div
                className={
                  weekday === todayKey
                    ? "coach-week-day coach-week-day-today"
                    : "coach-week-day"
                }
                key={weekday}
              >
                <div className="coach-week-day-header">
                  <div>
                    <span className="admin-section-kicker">
                      {weekday === todayKey ? "Hoje" : "Grupo fixo"}
                    </span>
                    <h3>{WEEKDAY_TITLE[weekday]}</h3>
                  </div>
                  <span className="coach-count-chip">{groups.length}</span>
                </div>

                <div className="coach-session-list">
                  {groups.map((group) => (
                    <div
                      className="coach-session-card coach-session-card-static"
                      key={group.id}
                    >
                      <div className="coach-session-card-main">
                        <strong>{group.title}</strong>
                        <span>{group.students.length} alunos</span>
                        <span className="coach-group-students">
                          {group.students.join(", ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card section-card">
        <div className="admin-section-heading">
          <div>
            <span className="admin-section-kicker">Histórico</span>
            <h2>Sessões recentes</h2>
          </div>
          <span className="coach-count-chip">{recentSessions.length}</span>
        </div>

        {recentSessions.length === 0 ? (
          <p className="muted">Ainda não há sessões registadas.</p>
        ) : (
          <div className="coach-session-list">
            {recentSessions.map((lesson) => (
              <button
                type="button"
                className="coach-session-card"
                key={lesson.id}
                onClick={() => setSelectedLessonId(lesson.id)}
              >
                <div className="coach-session-card-main">
                  <strong>{lesson.groupName || "Treino"}</strong>
                  <span>{formatDisplayDate(lesson.date)}</span>
                  <span>
                    {formatSessionCoaches(
                      lesson.coachName,
                      lesson.secondaryCoachName
                    )}
                  </span>
                </div>
                <span
                  className={`coach-session-card-status status-${lesson.status}`}
                >
                  {lesson.status === "finished" ? "Concluído" : "Aberto"}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedLesson && (
        <Modal
          title={selectedLesson.groupName || "Treino"}
          onClose={() => setSelectedLessonId(null)}
        >
          <div className="coach-session-modal">
            <div className="coach-session-meta">
              <p>{formatDisplayDate(selectedLesson.date)}</p>
              <p>
                Treinadores:{" "}
                {formatSessionCoaches(
                  selectedLesson.coachName,
                  selectedLesson.secondaryCoachName
                )}
              </p>
            </div>

            <CoachAttendancePanel
              lesson={selectedLesson}
              students={students}
              onSaved={loadData}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CoachArea;
