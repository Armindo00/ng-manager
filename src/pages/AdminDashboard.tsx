import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, Lesson, MonthlyEvaluation, Student } from "../types";
import type { FixedTraining } from "../data/fixedTrainings";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";
import { ensureFixedTrainingsSeeded } from "../services/fixedTrainingsService";
import { getCurrentMonthYear, getTodayDate } from "../utils/dateUtils";
import { formatSessionCoaches } from "../utils/sessionCoaches";

function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [fixedTrainings, setFixedTrainings] = useState<FixedTraining[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [
        studentsData,
        coachesData,
        lessonsData,
        evaluationsData,
        trainingsData,
      ] = await Promise.all([
        getStudents(),
        getCoaches(),
        getLessons(),
        getEvaluations(),
        ensureFixedTrainingsSeeded(),
      ]);

      setStudents(studentsData);
      setCoaches(coachesData);
      setLessons(lessonsData);
      setEvaluations(evaluationsData);
      setFixedTrainings(trainingsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const pendingPayments = students.filter((student) => !student.paid).length;
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const evaluationsThisMonth = evaluations.filter(
    (evaluation) =>
      evaluation.month === currentMonth && evaluation.year === currentYear
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

  const today = getTodayDate();
  const todayRegistered = lessons
    .filter((lesson) => lesson.date === today && lesson.status !== "draft")
    .sort((a, b) =>
      (a.groupName || "").localeCompare(b.groupName || "", "pt")
    );
  const todayOpen = todayRegistered.filter(
    (lesson) => lesson.status !== "finished"
  ).length;
  const todayFinished = todayRegistered.length - todayOpen;

  const alerts = [
    pendingPayments > 0
      ? `${pendingPayments} mensalidade${pendingPayments === 1 ? "" : "s"} em falta`
      : null,
    todayOpen > 0
      ? todayOpen === 1
        ? "1 sessão ainda aberta hoje"
        : `${todayOpen} sessões ainda abertas hoje`
      : null,
    evaluationsThisMonth === 0
      ? "Ainda sem avaliações este mês"
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="dashboard-page admin-dashboard">
      <header className="page-header">
        <p className="page-eyebrow">Administração</p>
        <h1 className="page-title">Visão geral</h1>
        <p className="page-description">
          Resumo do estado da escola. Para gerir alunos, escala ou pagamentos,
          usa o menu.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar visão geral...</p>
      ) : (
        <>
          <div className="stats-grid admin-snapshot-grid">
            <div className="card stat-card">
              <span className="stat-label">Hoje</span>
              <strong className="stat-number">{todayRegistered.length}</strong>
              <span className="stat-hint">
                {todayRegistered.length === 0
                  ? "sem sessões registadas"
                  : `${todayFinished} concluída${todayFinished === 1 ? "" : "s"} · ${todayOpen} aberta${todayOpen === 1 ? "" : "s"}`}
              </span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Mensalidades</span>
              <strong className="stat-number">{pendingPayments}</strong>
              <span className="stat-hint">
                {pendingPayments > 0 ? "em falta" : "tudo em dia"}
              </span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Presença</span>
              <strong className="stat-number">{attendanceRate}%</strong>
              <span className="stat-hint">média global</span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Escola</span>
              <strong className="stat-number">{students.length}</strong>
              <span className="stat-hint">
                alunos · {coaches.length} treinador
                {coaches.length === 1 ? "" : "es"} · {fixedTrainings.length}{" "}
                grupos
              </span>
            </div>
          </div>

          {alerts.length > 0 && (
            <section className="card section-card admin-attention-card">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-section-kicker">Atenção</span>
                  <h2>Pontos a acompanhar</h2>
                </div>
              </div>
              <ul className="admin-alert-list">
                {alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card section-card">
            <div className="admin-section-heading">
              <div>
                <span className="admin-section-kicker">Hoje</span>
                <h2>Sessões registadas</h2>
              </div>
            </div>

            {todayRegistered.length === 0 ? (
              <p className="muted">
                Ainda não há sessões registadas hoje. Os treinadores fazem-no em
                Hoje.
              </p>
            ) : (
              <div className="admin-summary-list">
                {todayRegistered.map((lesson) => {
                  const present = lesson.presentStudentIds.filter((id) =>
                    lesson.bookedStudentIds.includes(id)
                  ).length;
                  const status =
                    lesson.status === "finished" ? "Concluído" : "Aberto";

                  return (
                    <div className="admin-summary-row" key={lesson.id}>
                      <div className="admin-summary-main">
                        <strong>{lesson.groupName || "Treino"}</strong>
                        <span>
                          {formatSessionCoaches(
                            lesson.coachName,
                            lesson.secondaryCoachName
                          )}{" "}
                          · {present}/{lesson.bookedStudentIds.length} presentes
                        </span>
                      </div>
                      <span
                        className={`admin-summary-status${
                          lesson.status === "finished" ? " is-done" : ""
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
