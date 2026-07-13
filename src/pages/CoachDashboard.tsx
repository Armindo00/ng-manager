import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, MonthlyEvaluation, Student, User } from "../types";
import { getStudents } from "../services/studentsService";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";
import Modal from "../components/Modal";
import LessonDetailCard from "../components/LessonDetailCard";
import CoachStudentResponsesPanel from "../components/CoachStudentResponsesPanel";

type Props = {
  user: User;
};

function CoachDashboard({ user }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [lessonsData, studentsData, evaluationsData] = await Promise.all([
        getLessons(),
        getStudents(),
        getEvaluations(),
      ]);

      const coachLessons = lessonsData.filter(
        (lesson) => lesson.coachId === user.id
      );

      setLessons(coachLessons);
      setStudents(studentsData);
      setEvaluations(evaluationsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar o dashboard do treinador.");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  const sortedLessons = [...lessons].sort((a, b) =>
    `${a.date} ${a.time || ""}`.localeCompare(
      `${b.date} ${b.time || ""}`
    )
  );

  const todayLessons = sortedLessons.filter(
    (lesson) => lesson.date === today && lesson.status !== "finished"
  );

  const upcomingLessons = sortedLessons
    .filter(
      (lesson) =>
        lesson.date > today && lesson.status !== "finished"
    )
    .slice(0, 6);

  const draftLessons = lessons.filter(
    (lesson) => lesson.status === "draft"
  );

  const publishedLessons = lessons.filter(
    (lesson) => lesson.status === "published"
  );

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const evaluatedStudentIds = evaluations
    .filter(
      (evaluation) =>
        evaluation.month === currentMonth &&
        evaluation.year === currentYear &&
        evaluation.coachId === user.id
    )
    .map((evaluation) => evaluation.studentId);

  const coachStudentIds = new Set(
    lessons.flatMap((lesson) => lesson.bookedStudentIds)
  );

  const coachStudents = students.filter((student) =>
    coachStudentIds.has(student.id)
  );

  const pendingEvaluations = coachStudents.filter(
    (student) => !evaluatedStudentIds.includes(student.id)
  );

  function getResponseCounts(lesson: Lesson) {
    const responses = lesson.responses || [];

    const confirmed = responses.filter(
      (response) => response.status === "confirmed"
    ).length;

    const declined = responses.filter(
      (response) => response.status === "declined"
    ).length;

    const pending = Math.max(
      lesson.bookedStudentIds.length - confirmed - declined,
      0
    );

    return {
      confirmed,
      declined,
      pending,
    };
  }

  function renderLessonCard(lesson: Lesson) {
    const counts = getResponseCounts(lesson);

    return (
      <article className="coach-dashboard-lesson" key={lesson.id}>
        <div className="coach-lesson-main">
          <div>
            <span className={`coach-lesson-status status-${lesson.status}`}>
              {lesson.status === "draft" && "Rascunho"}
              {lesson.status === "published" && "Publicado"}
              {lesson.status === "finished" && "Concluído"}
            </span>

            <h3>{lesson.groupName || "Treino extra"}</h3>

            <p>
              📅 {lesson.date}
              {lesson.time ? ` · Chegada à praia: ${lesson.time}` : ""}
            </p>

            <p>🏖️ {lesson.beach || "Praia por definir"}</p>
            <p>🚐 {lesson.van || "Carrinha por definir"}</p>
          </div>

          <button
            type="button"
            className="primary-btn coach-open-lesson-btn"
            onClick={() => setSelectedLesson(lesson)}
          >
            Abrir treino
          </button>
        </div>

        <div className="coach-lesson-summary">
          <div>
            <span>Alunos</span>
            <strong>{lesson.bookedStudentIds.length}</strong>
          </div>

          <div>
            <span>Confirmados</span>
            <strong>{counts.confirmed}</strong>
          </div>

          <div>
            <span>Não vão</span>
            <strong>{counts.declined}</strong>
          </div>

          <div>
            <span>Sem resposta</span>
            <strong>{counts.pending}</strong>
          </div>
        </div>

        <CoachStudentResponsesPanel
          lesson={lesson}
          students={students}
          compact
        />
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
          <h1 className="page-title">Olá, {user.name} 👋</h1>
        </div>

        <p>
          Hoje tens <strong>{todayLessons.length}</strong>{" "}
          {todayLessons.length === 1 ? "treino" : "treinos"}.
        </p>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-label">🏄 Treinos hoje</span>
          <strong className="stat-number">{todayLessons.length}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">📝 Por publicar</span>
          <strong className="stat-number">{draftLessons.length}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">📢 Publicados</span>
          <strong className="stat-number">{publishedLessons.length}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">⭐ Avaliações pendentes</span>
          <strong className="stat-number">
            {pendingEvaluations.length}
          </strong>
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

      <section className="card section-card">
        <div className="coach-section-title">
          <div>
            <span>Avaliações mensais</span>
            <h2>Alunos por avaliar</h2>
          </div>

          <strong>{pendingEvaluations.length}</strong>
        </div>

        {pendingEvaluations.length === 0 ? (
          <p className="muted">
            Todas as avaliações deste mês estão concluídas.
          </p>
        ) : (
          <div className="coach-pending-evaluations">
            {pendingEvaluations.map((student) => (
              <div key={student.id}>
                <strong>{student.name}</strong>
                <span>{student.level || "Nível não definido"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedLesson && (
        <Modal
          title="Ficha do treino"
          onClose={() => {
            setSelectedLesson(null);
            loadData();
          }}
        >
          <LessonDetailCard
            lesson={selectedLesson}
            students={students}
            readOnlyVan
            coachMode
            onClose={() => {
              setSelectedLesson(null);
              loadData();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export default CoachDashboard;
