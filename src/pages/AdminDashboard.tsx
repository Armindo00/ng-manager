import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, Lesson, MonthlyEvaluation, Student } from "../types";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";
import LessonsCalendar from "../components/LessonsCalendar";
import Modal from "../components/Modal";
import LessonDetailCard from "../components/LessonDetailCard";
import { getCurrentMonthYear } from "../utils/dateUtils";

type AdminSection =
  | "dashboard"
  | "setup"
  | "students"
  | "coaches"
  | "groups"
  | "recurring"
  | "lessons"
  | "inventory"
  | "vans"
  | "compensations"
  | "evaluations"
  | "payments";

type Props = {
  onChangeSection: (section: AdminSection) => void;
};

function AdminDashboard({ onChangeSection }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [dayLessons, setDayLessons] = useState<Lesson[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [studentsData, coachesData, lessonsData, evaluationsData] =
        await Promise.all([
          getStudents(),
          getCoaches(),
          getLessons(),
          getEvaluations(),
        ]);

      setStudents(studentsData);
      setCoaches(coachesData);
      setLessons(lessonsData);
      setEvaluations(evaluationsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectCalendarDay(dayLessonsList: Lesson[], date: string) {
    if (dayLessonsList.length === 1) {
      setSelectedLesson(dayLessonsList[0]);
      return;
    }

    setDayLessons(dayLessonsList);
    setSelectedDate(date);
  }

  const pendingPayments = students.filter((student) => !student.paid).length;
  const draftLessons = lessons.filter((lesson) => lesson.status === "draft").length;
  const publishedLessons = lessons.filter((lesson) => lesson.status === "published").length;
  const finishedLessons = lessons.filter((lesson) => lesson.status === "finished").length;

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

  const upcomingLessons = lessons
    .filter((lesson) => lesson.status !== "finished")
    .slice(0, 5);

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Administração</h1>
      <p className="muted admin-home-intro">
        Gestão da escola: alunos, treinadores, treinos e restantes áreas.
      </p>

      {loading ? (
        <p className="muted">A carregar dashboard...</p>
      ) : (
        <>
      <div className="admin-module-grid">
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("setup")}>
          <strong>Setup escola</strong>
          <span>Importar alunos e criar treinadores</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("students")}>
          <strong>Alunos</strong>
          <span>{students.length} registos</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("coaches")}>
          <strong>Treinadores</strong>
          <span>{coaches.length} registos</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("groups")}>
          <strong>Grupos</strong>
          <span>Turmas e alunos fixos</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("recurring")}>
          <strong>Horários</strong>
          <span>Treinos recorrentes</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("lessons")}>
          <strong>Calendário</strong>
          <span>{publishedLessons} publicados · {draftLessons} rascunhos</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("inventory")}>
          <strong>Inventário</strong>
          <span>Material da escola</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("vans")}>
          <strong>Carrinhas</strong>
          <span>Frota e tarefas</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("compensations")}>
          <strong>Compensações</strong>
          <span>Faltas a repor</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("evaluations")}>
          <strong>Avaliações</strong>
          <span>{evaluationsThisMonth} este mês</span>
        </button>
        <button type="button" className="admin-module-card" onClick={() => onChangeSection("payments")}>
          <strong>Pagamentos</strong>
          <span>{pendingPayments} pendentes</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-label">Total de alunos</span>
          <strong className="stat-number">{students.length}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Treinadores</span>
          <strong className="stat-number">{coaches.length}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Treinos concluídos</span>
          <strong className="stat-number">{finishedLessons}</strong>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Presença média</span>
          <strong className="stat-number">{attendanceRate}%</strong>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="card section-card">
          <h2>Próximos treinos</h2>

          <div className="lesson-preview-list">
            {upcomingLessons.map((lesson) => (
              <div
                className="lesson-preview lesson-preview-button"
                key={lesson.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedLesson(lesson)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setSelectedLesson(lesson);
                  }
                }}
              >
                <strong>{lesson.date}</strong>
                <span>{lesson.time || "--:--"}</span>
                <span>{lesson.groupName || "Treino Extra"}</span>
                <span>{lesson.beach || "Praia por definir"}</span>
              </div>
            ))}
          </div>

          {upcomingLessons.length === 0 && (
            <p className="muted">Ainda não existem treinos.</p>
          )}
        </div>
      </div>

      <div className="calendar-wrapper">
        <LessonsCalendar
          lessons={lessons}
          onSelectDay={handleSelectCalendarDay}
        />
      </div>

      {dayLessons.length > 1 && (
        <Modal
          title={`Treinos de ${selectedDate}`}
          onClose={() => {
            setDayLessons([]);
            setSelectedDate("");
          }}
        >
          <div className="calendar-day-lessons-list">
            {dayLessons.map((lesson) => (
              <button
                type="button"
                className="calendar-day-lesson-row"
                key={lesson.id}
                onClick={() => {
                  setDayLessons([]);
                  setSelectedDate("");
                  setSelectedLesson(lesson);
                }}
              >
                <strong>{lesson.time || "--:--"}</strong>
                <span>{lesson.groupName || "Treino Extra"}</span>
                <small>{lesson.beach || "Praia por definir"}</small>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {selectedLesson && (
        <Modal title="Ficha do treino" onClose={() => setSelectedLesson(null)}>
          <LessonDetailCard lesson={selectedLesson} students={students} />
        </Modal>
      )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
