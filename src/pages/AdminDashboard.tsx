import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, Lesson, MonthlyEvaluation, Student } from "../types";
import type { FixedTraining } from "../data/fixedTrainings";
import type { Van, VanTask } from "../types/van";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";
import { ensureFixedTrainingsSeeded } from "../services/fixedTrainingsService";
import { getVanTasks, getVans } from "../services/vansService";
import { getInventoryItems } from "../services/inventoryService";
import type { InventoryItem } from "../types/inventory";
import { getCurrentMonthYear, getTodayDate } from "../utils/dateUtils";
import { formatSessionCoaches } from "../utils/sessionCoaches";
import { listOverQuotaStudents } from "../utils/studentTrainingUsage";
import { buildAdminAttentionAlerts } from "../utils/adminAttentionAlerts";
import LoadingBlock from "../components/LoadingBlock";

type Props = {
  onNavigate?: (section: string) => void;
};

function AdminDashboard({ onNavigate }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [fixedTrainings, setFixedTrainings] = useState<FixedTraining[]>([]);
  const [vanTasks, setVanTasks] = useState<VanTask[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
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
        vanTasksData,
        vansData,
        inventoryData,
      ] = await Promise.all([
        getStudents(),
        getCoaches(),
        getLessons(),
        getEvaluations(),
        ensureFixedTrainingsSeeded(),
        getVanTasks(),
        getVans(),
        getInventoryItems().catch(() => [] as InventoryItem[]),
      ]);

      setStudents(studentsData);
      setCoaches(coachesData);
      setLessons(lessonsData);
      setEvaluations(evaluationsData);
      setFixedTrainings(trainingsData);
      setVanTasks(vanTasksData);
      setVans(vansData);
      setInventoryItems(inventoryData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const pendingPayments = students.filter((student) => !student.paid).length;
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();

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

  const overQuota = listOverQuotaStudents(
    students,
    lessons,
    currentMonth,
    currentYear
  );

  const alerts = buildAdminAttentionAlerts({
    students,
    lessons,
    evaluations,
    vanTasks,
    vans,
    inventoryItems,
    today,
    month: currentMonth,
    year: currentYear,
  });

  return (
    <div className="dashboard-page admin-dashboard">
      <header className="page-header">
        <p className="page-eyebrow">NextGeneration · Administração</p>
        <h1 className="page-title">Visão geral</h1>
        <p className="page-description">
          Resumo do estado da escola. A caixa Atenção junta carrinhas, chaves,
          prazos, treinos a mais e mensalidades em falta.
        </p>
      </header>

      {loading ? (
        <LoadingBlock label="A carregar visão geral..." />
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

          <section className="card section-card admin-attention-card">
            <div className="admin-section-heading">
              <div>
                <span className="admin-section-kicker">Atenção</span>
                <h2>Pontos a acompanhar</h2>
              </div>
              {alerts.length > 0 && (
                <span className="coach-count-chip">{alerts.length}</span>
              )}
            </div>

            {alerts.length === 0 ? (
              <p className="muted">Tudo em dia — sem alertas neste momento.</p>
            ) : (
              <ul className="admin-alert-list">
                {alerts.map((alert) => {
                  const clickable = Boolean(onNavigate && alert.section);
                  const content = (
                    <>
                      <strong
                        className={
                          alert.severity === "danger"
                            ? "admin-alert-title is-danger"
                            : "admin-alert-title"
                        }
                      >
                        {alert.text}
                      </strong>
                      {alert.detail ? (
                        <span className="admin-alert-detail">{alert.detail}</span>
                      ) : null}
                    </>
                  );

                  return (
                    <li key={alert.id}>
                      {clickable ? (
                        <button
                          type="button"
                          className="admin-alert-link"
                          onClick={() => onNavigate?.(alert.section!)}
                        >
                          {content}
                        </button>
                      ) : (
                        <div className="admin-alert-static">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {overQuota.length > 0 && (
            <section className="card section-card">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-section-kicker">Quotas</span>
                  <h2>Treinos a mais este mês</h2>
                </div>
              </div>
              <div className="admin-summary-list">
                {overQuota.slice(0, 8).map((row) => (
                  <div className="admin-summary-row" key={row.studentId}>
                    <div className="admin-summary-main">
                      <strong>{row.studentName}</strong>
                      <span>{row.label}</span>
                    </div>
                    <span className="admin-summary-status is-warn">
                      {row.billingType === "pack" ? "Pack" : `+${row.overBy}`}
                    </span>
                  </div>
                ))}
              </div>
              {overQuota.length > 8 && (
                <p className="muted">
                  +{overQuota.length - 8} na página Treinos a mais.
                </p>
              )}
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
