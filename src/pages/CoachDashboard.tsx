import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import Modal from "../components/Modal";
import CoachAttendancePanel from "../components/CoachAttendancePanel";
import { getTodayDate } from "../utils/dateUtils";
import { canMarkAttendance } from "../utils/lessonWorkflow";

type Props = {
  user: User;
};

function CoachDashboard({ user }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
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
        .filter((lesson) => lesson.coachId === user.id)
        .sort((a, b) =>
          `${a.date} ${a.time || ""}`.localeCompare(
            `${b.date} ${b.time || ""}`
          )
        );

      setLessons(coachLessons);
      setStudents(studentsData);

      setSelectedLesson((current) => {
        if (!current) return null;
        return coachLessons.find((lesson) => lesson.id === current.id) ?? null;
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar o dashboard do treinador.");
    } finally {
      setLoading(false);
    }
  }

  const today = getTodayDate();

  const activeLessons = lessons.filter((lesson) => lesson.status !== "draft");

  const todayLessons = activeLessons.filter(
    (lesson) => lesson.date === today && lesson.status !== "finished"
  );

  const upcomingLessons = activeLessons
    .filter((lesson) => lesson.date > today && lesson.status !== "finished")
    .slice(0, 6);

  const pendingAttendance = activeLessons.filter((lesson) => {
    if (!canMarkAttendance(lesson) || lesson.status === "finished") return false;
    return lesson.presentStudentIds.length < lesson.bookedStudentIds.length;
  }).length;

  function renderLessonCard(lesson: Lesson) {
    const presentCount = lesson.presentStudentIds.filter((id) =>
      lesson.bookedStudentIds.includes(id)
    ).length;

    return (
      <article className="coach-dashboard-lesson" key={lesson.id}>
        <div className="coach-lesson-main">
          <div>
            <span className={`coach-lesson-status status-${lesson.status}`}>
              {lesson.status === "published" && "Agendado"}
              {lesson.status === "finished" && "Concluído"}
            </span>

            <h3>{lesson.groupName || "Treino"}</h3>

            <p>
              {lesson.date}
              {lesson.time ? ` · ${lesson.time}` : ""}
            </p>

            <p>{lesson.beach || "Praia por definir"}</p>
            <p>
              Presenças: {presentCount}/{lesson.bookedStudentIds.length}
            </p>
          </div>

          <button
            type="button"
            className="primary-btn coach-open-lesson-btn"
            onClick={() => setSelectedLesson(lesson)}
          >
            Registar presenças
          </button>
        </div>
      </article>
    );
  }

  if (loading) {
    return <p className="muted">A carregar dashboard...</p>;
  }

  return (
    <div className="coach-dashboard-page">
      <div className="coach-dashboard-heading">
        <div>
          <span className="coach-dashboard-kicker">Área do treinador</span>
          <h1 className="page-title">Olá, {user.name}</h1>
        </div>

        <p>
          Hoje tens <strong>{todayLessons.length}</strong>{" "}
          {todayLessons.length === 1 ? "treino" : "treinos"}.
        </p>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-label">Treinos hoje</span>
          <strong className="stat-number">{todayLessons.length}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Próximos treinos</span>
          <strong className="stat-number">{upcomingLessons.length}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Presenças por marcar</span>
          <strong className="stat-number">{pendingAttendance}</strong>
        </div>
      </div>

      <section className="card section-card">
        <div className="coach-section-title">
          <div>
            <span>Agenda</span>
            <h2>Treinos de hoje</h2>
          </div>
          <strong>{todayLessons.length}</strong>
        </div>

        {todayLessons.length === 0 ? (
          <p className="muted">Não tens treinos hoje.</p>
        ) : (
          <div className="coach-dashboard-lessons">
            {todayLessons.map(renderLessonCard)}
          </div>
        )}
      </section>

      <section className="card section-card">
        <div className="coach-section-title">
          <div>
            <span>Agenda</span>
            <h2>Próximos treinos</h2>
          </div>
          <strong>{upcomingLessons.length}</strong>
        </div>

        {upcomingLessons.length === 0 ? (
          <p className="muted">Não tens próximos treinos agendados.</p>
        ) : (
          <div className="coach-dashboard-lessons">
            {upcomingLessons.map(renderLessonCard)}
          </div>
        )}
      </section>

      {selectedLesson && (
        <Modal
          title={`${selectedLesson.groupName || "Treino"}${selectedLesson.time ? ` · ${selectedLesson.time}` : ""}`}
          onClose={() => setSelectedLesson(null)}
        >
          <CoachAttendancePanel
            lesson={selectedLesson}
            students={students}
            onSaved={loadData}
          />
        </Modal>
      )}
    </div>
  );
}

export default CoachDashboard;
