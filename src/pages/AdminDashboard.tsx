import { useEffect, useState } from "react";
import type { Coach, Lesson, MonthlyEvaluation, Student } from "../types";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";
import LessonsCalendar from "../components/LessonsCalendar";

function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setStudents(await getStudents());
    setCoaches(await getCoaches());
    setLessons(await getLessons());
    setEvaluations(await getEvaluations());
  }

  const pendingPayments = students.filter((student) => !student.paid).length;
  const draftLessons = lessons.filter((lesson) => lesson.status === "draft").length;
  const publishedLessons = lessons.filter((lesson) => lesson.status === "published").length;
  const finishedLessons = lessons.filter((lesson) => lesson.status === "finished").length;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const evaluationsThisMonth = evaluations.filter(
    (evaluation) => evaluation.month === currentMonth && evaluation.year === currentYear
  ).length;

  const totalBooked = lessons.reduce(
    (total, lesson) => total + lesson.bookedStudentIds.length,
    0
  );

  const totalPresent = lessons.reduce(
    (total, lesson) => total + lesson.presentStudentIds.length,
    0
  );

  const attendanceRate =
    totalBooked === 0 ? 0 : Math.round((totalPresent / totalBooked) * 100);

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard</h1>

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-label">👥 Total de alunos</span>
          <strong className="stat-number">{students.length}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">🏄 Treinadores</span>
          <strong className="stat-number">{coaches.length}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">📝 Treinos por publicar</span>
          <strong className="stat-number">{draftLessons}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">📢 Treinos publicados</span>
          <strong className="stat-number">{publishedLessons}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">✅ Treinos concluídos</span>
          <strong className="stat-number">{finishedLessons}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">💳 Pagamentos pendentes</span>
          <strong className="stat-number">{pendingPayments}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">⭐ Avaliações este mês</span>
          <strong className="stat-number">{evaluationsThisMonth}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">📊 Presença média</span>
          <strong className="stat-number">{attendanceRate}%</strong>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="card section-card">
          <h2>📅 Próximos Treinos</h2>

          <div className="lesson-preview-list">
            {lessons
              .filter((lesson) => lesson.status !== "finished")
              .slice(0, 5)
              .map((lesson) => (
                <div className="lesson-preview" key={lesson.id}>
                  <strong>{lesson.date}</strong>
                  <span>{lesson.time || "--:--"}</span>
                  <span>{lesson.groupName || "Treino Extra"}</span>
                  <span>{lesson.beach || "Praia por definir"}</span>
                </div>
              ))}
          </div>

          {lessons.length === 0 && (
            <p className="muted">Ainda não existem treinos.</p>
          )}
        </div>

        <div className="card section-card">
          <h2>⚡ Ações Rápidas</h2>

          <div className="quick-actions">
            <button className="primary-btn">➕ Novo Aluno</button>
            <button className="primary-btn">👨‍🏫 Novo Treinador</button>
            <button className="primary-btn">👥 Novo Grupo</button>
            <button className="primary-btn">🏄 Criar Treino</button>
          </div>
        </div>
      </div>

      <div className="calendar-wrapper">
  <LessonsCalendar lessons={lessons} />
</div>
    </div>
  );
}

export default AdminDashboard;
