import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Package,
  Star,
  Truck,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Coach, Lesson, MonthlyEvaluation, Student } from "../types";
import type { FixedTraining } from "../data/fixedTrainings";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";
import { ensureFixedTrainingsSeeded } from "../services/fixedTrainingsService";
import Modal from "../components/Modal";
import LessonDetailCard from "../components/LessonDetailCard";
import { getCurrentMonthYear, getTodayDate } from "../utils/dateUtils";
import {
  getUpcomingCalendarEntries,
  statusLabelForEntry,
} from "../utils/fixedScheduleCalendar";

type AdminSection =
  | "dashboard"
  | "setup"
  | "students"
  | "coaches"
  | "fixed-trainings"
  | "lessons"
  | "inventory"
  | "vans"
  | "compensations"
  | "evaluations"
  | "payments"
  | "coach-activity";

type Props = {
  onChangeSection: (section: AdminSection) => void;
};

type ModuleLink = {
  section: AdminSection;
  title: string;
  detail: string;
  icon: LucideIcon;
};

type ModuleGroup = {
  title: string;
  description: string;
  items: ModuleLink[];
};

function AdminDashboard({ onChangeSection }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [fixedTrainings, setFixedTrainings] = useState<FixedTraining[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
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
  const todayRegistered = lessons.filter(
    (lesson) => lesson.date === today && lesson.status !== "draft"
  );
  const todayOpen = todayRegistered.filter(
    (lesson) => lesson.status !== "finished"
  ).length;

  const upcoming = useMemo(
    () => getUpcomingCalendarEntries(lessons, fixedTrainings, 5),
    [lessons, fixedTrainings]
  );

  const attentionItems = [
    pendingPayments > 0
      ? {
          id: "payments",
          label: `${pendingPayments} mensalidade${pendingPayments === 1 ? "" : "s"} em falta`,
          action: "Ver pagamentos" as const,
          section: "payments" as AdminSection,
        }
      : null,
    todayOpen > 0
      ? {
          id: "today-open",
          label:
            todayOpen === 1
              ? "1 sessão aberta hoje"
              : `${todayOpen} sessões abertas hoje`,
          action: "Ver calendário" as const,
          section: "lessons" as AdminSection,
        }
      : null,
    evaluationsThisMonth === 0
      ? {
          id: "evaluations",
          label: "Ainda sem avaliações este mês",
          action: "Abrir avaliações" as const,
          section: "evaluations" as AdminSection,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    action: string;
    section: AdminSection;
  }>;

  const moduleGroups: ModuleGroup[] = [
    {
      title: "Pessoas",
      description: "Fichas e contas da escola",
      items: [
        {
          section: "students",
          title: "Alunos",
          detail: `${students.length} fichas`,
          icon: Users,
        },
        {
          section: "coaches",
          title: "Treinadores",
          detail: `${coaches.length} contas`,
          icon: UserCircle,
        },
        {
          section: "setup",
          title: "Importação",
          detail: "Alunos e passwords",
          icon: Wrench,
        },
      ],
    },
    {
      title: "Escala e treinos",
      description: "Semana, histórico e totais",
      items: [
        {
          section: "fixed-trainings",
          title: "Grupos fixos",
          detail: `${fixedTrainings.length} na escala`,
          icon: CalendarDays,
        },
        {
          section: "lessons",
          title: "Calendário",
          detail: `${todayRegistered.length} hoje`,
          icon: Calendar,
        },
        {
          section: "coach-activity",
          title: "Relatório mensal",
          detail: "Totais por treinador",
          icon: BarChart3,
        },
      ],
    },
    {
      title: "Gestão",
      description: "Follow-up e logística",
      items: [
        {
          section: "payments",
          title: "Pagamentos",
          detail:
            pendingPayments > 0
              ? `${pendingPayments} pendentes`
              : "Em dia",
          icon: CreditCard,
        },
        {
          section: "evaluations",
          title: "Avaliações",
          detail: `${evaluationsThisMonth} este mês`,
          icon: Star,
        },
        {
          section: "compensations",
          title: "Compensações",
          detail: "Faltas a repor",
          icon: CalendarClock,
        },
        {
          section: "inventory",
          title: "Inventário",
          detail: "Material",
          icon: Package,
        },
        {
          section: "vans",
          title: "Carrinhas",
          detail: "Frota",
          icon: Truck,
        },
      ],
    },
  ];

  return (
    <div className="dashboard-page admin-dashboard">
      <header className="page-header">
        <p className="page-eyebrow">Administração</p>
        <h1 className="page-title">Visão geral</h1>
        <p className="page-description">
          Estado da escola e atalhos por área. Presenças do dia ficam em{" "}
          <strong>Hoje</strong>, no menu principal.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar visão geral...</p>
      ) : (
        <>
          <div className="stats-grid admin-snapshot-grid">
            <div className="card stat-card">
              <span className="stat-label">Sessões hoje</span>
              <strong className="stat-number">{todayRegistered.length}</strong>
              <span className="stat-hint">
                {todayOpen > 0
                  ? `${todayOpen} por concluir`
                  : todayRegistered.length > 0
                    ? "Todas concluídas"
                    : "Nenhuma registada"}
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
              <span className="stat-label">Escala</span>
              <strong className="stat-number">{fixedTrainings.length}</strong>
              <span className="stat-hint">grupos fixos</span>
            </div>
          </div>

          {attentionItems.length > 0 && (
            <section className="card section-card admin-attention-card">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-section-kicker">Prioridade</span>
                  <h2>Precisa de atenção</h2>
                </div>
              </div>

              <div className="admin-attention-list">
                {attentionItems.map((item) => (
                  <button
                    type="button"
                    className="admin-attention-row"
                    key={item.id}
                    onClick={() => onChangeSection(item.section)}
                  >
                    <span>{item.label}</span>
                    <span className="admin-attention-action">
                      {item.action}
                      <ArrowRight size={16} strokeWidth={2.2} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="admin-module-groups">
            {moduleGroups.map((group) => (
              <section className="card section-card admin-module-group" key={group.title}>
                <div className="admin-section-heading">
                  <div>
                    <span className="admin-section-kicker">{group.title}</span>
                    <h2>{group.description}</h2>
                  </div>
                </div>

                <div className="admin-module-grid">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        className="admin-module-card"
                        key={item.section}
                        onClick={() => onChangeSection(item.section)}
                      >
                        <span className="admin-module-icon">
                          <Icon size={18} strokeWidth={2} />
                        </span>
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <section className="card section-card">
            <div className="admin-section-heading">
              <div>
                <span className="admin-section-kicker">Próximos</span>
                <h2>Na escala</h2>
              </div>
              <button
                type="button"
                className="compact-btn"
                onClick={() => onChangeSection("lessons")}
              >
                Calendário completo
              </button>
            </div>

            {upcoming.length === 0 ? (
              <p className="muted">Sem grupos próximos na escala.</p>
            ) : (
              <div className="admin-upcoming-list">
                {upcoming.map((entry) => (
                  <button
                    type="button"
                    className="admin-upcoming-row"
                    key={entry.id}
                    onClick={() => {
                      if (entry.lesson) setSelectedLesson(entry.lesson);
                      else onChangeSection("lessons");
                    }}
                  >
                    <div className="admin-upcoming-main">
                      <strong>{entry.title}</strong>
                      <span>
                        {entry.date}
                        {entry.coachName ? ` · ${entry.coachName}` : ""}
                      </span>
                    </div>
                    <span className="admin-upcoming-status">
                      {statusLabelForEntry(entry)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedLesson && (
            <Modal
              title="Ficha do treino"
              onClose={() => setSelectedLesson(null)}
            >
              <LessonDetailCard lesson={selectedLesson} students={students} />
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
