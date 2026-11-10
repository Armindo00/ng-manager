import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons, updateLesson } from "../services/lessonsService";
import Modal from "../components/Modal";
import CoachAttendancePanel from "../components/CoachAttendancePanel";
import { getTodayDate } from "../utils/dateUtils";
import { canFinishLesson, canMarkAttendance } from "../utils/lessonWorkflow";

type Props = {
  user: User;
};

function lessonTitle(lesson: Lesson) {
  return lesson.groupName?.trim() || "Treino";
}

function CoachDashboard({ user }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [lessonsData, studentsData] = await Promise.all([
        getLessons(),
        getStudents(),
      ]);

      const coachLessons = lessonsData
        .filter(
          (lesson) =>
            lesson.coachId === user.id && lesson.status !== "draft"
        )
        .sort((a, b) =>
          `${b.date} ${b.time || ""}`.localeCompare(
            `${a.date} ${a.time || ""}`
          )
        );

      setLessons(coachLessons);
      setStudents(studentsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar os teus treinos.");
    } finally {
      setLoading(false);
    }
  }

  const today = getTodayDate();

  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  const todayLessons = useMemo(
    () => lessons.filter((lesson) => lesson.date === today),
    [lessons, today]
  );

  const recentLessons = useMemo(
    () =>
      lessons
        .filter((lesson) => lesson.date < today)
        .slice(0, 8),
    [lessons, today]
  );

  const upcomingLessons = useMemo(
    () =>
      lessons
        .filter(
          (lesson) => lesson.date > today && lesson.status !== "finished"
        )
        .sort((a, b) =>
          `${a.date} ${a.time || ""}`.localeCompare(
            `${b.date} ${b.time || ""}`
          )
        )
        .slice(0, 6),
    [lessons, today]
  );

  async function finishLesson(lesson: Lesson) {
    if (!canFinishLesson(lesson)) {
      toast.error("Só podes finalizar o treino no dia do treino ou depois.");
      return;
    }

    try {
      await updateLesson({ ...lesson, status: "finished" });
      await loadData();
      toast.success("Treino finalizado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao finalizar treino.");
    }
  }

  function renderLessonButton(lesson: Lesson) {
    const presentCount = lesson.presentStudentIds.filter((id) =>
      lesson.bookedStudentIds.includes(id)
    ).length;
    const readyForAttendance = canMarkAttendance(lesson);

    return (
      <button
        type="button"
        className="coach-session-card"
        key={lesson.id}
        onClick={() => setSelectedLessonId(lesson.id)}
      >
        <div className="coach-session-card-main">
          <strong>{lessonTitle(lesson)}</strong>
          <span>
            {lesson.date}
            {lesson.time ? ` · ${lesson.time}` : ""}
          </span>
          <span>
            {lesson.bookedStudentIds.length} alunos · {presentCount} presentes
          </span>
        </div>

        <span
          className={`coach-session-card-status status-${lesson.status}${
            readyForAttendance && lesson.status !== "finished"
              ? " ready"
              : ""
          }`}
        >
          {lesson.status === "finished"
            ? "Concluído"
            : readyForAttendance
              ? "Marcar"
              : "Agendado"}
        </span>
      </button>
    );
  }

  if (loading) {
    return <p className="muted">A carregar treinos...</p>;
  }

  return (
    <div className="coach-dashboard-page">
      <div className="coach-dashboard-heading">
        <div>
          <span className="coach-dashboard-kicker">Os teus treinos</span>
          <h1 className="page-title">Olá, {user.name}</h1>
        </div>
        <p>
          Abre o treino que deste e marca presenças, faltas ou adiciona um
          aluno extra.
        </p>
      </div>

      <section className="card section-card">
        <div className="coach-section-title">
          <div>
            <span>Hoje</span>
            <h2>Treinos de hoje</h2>
          </div>
          <strong>{todayLessons.length}</strong>
        </div>

        {todayLessons.length === 0 ? (
          <p className="muted">Não tens treinos hoje.</p>
        ) : (
          <div className="coach-session-list">
            {todayLessons.map(renderLessonButton)}
          </div>
        )}
      </section>

      {recentLessons.length > 0 && (
        <section className="card section-card">
          <div className="coach-section-title">
            <div>
              <span>Recentes</span>
              <h2>Últimos treinos</h2>
            </div>
            <strong>{recentLessons.length}</strong>
          </div>

          <div className="coach-session-list">
            {recentLessons.map(renderLessonButton)}
          </div>
        </section>
      )}

      {upcomingLessons.length > 0 && (
        <section className="card section-card">
          <div className="coach-section-title">
            <div>
              <span>Próximos</span>
              <h2>Treinos a seguir</h2>
            </div>
            <strong>{upcomingLessons.length}</strong>
          </div>

          <div className="coach-session-list">
            {upcomingLessons.map(renderLessonButton)}
          </div>
        </section>
      )}

      {selectedLesson && (
        <Modal
          title={lessonTitle(selectedLesson)}
          onClose={() => setSelectedLessonId(null)}
        >
          <div className="coach-session-modal">
            <div className="coach-session-meta">
              <p>
                {selectedLesson.date}
                {selectedLesson.time ? ` · ${selectedLesson.time}` : ""}
              </p>
              {selectedLesson.beach ? <p>{selectedLesson.beach}</p> : null}
            </div>

            <CoachAttendancePanel
              lesson={selectedLesson}
              students={students}
              onSaved={loadData}
            />

            {canFinishLesson(selectedLesson) && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => finishLesson(selectedLesson)}
              >
                Finalizar treino
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CoachDashboard;
