import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Coach, Lesson, MonthlyEvaluation, Student } from "../types";
import type { FixedTraining } from "../data/fixedTrainings";
import { getStudents } from "../services/studentsService";
import { getCoaches } from "../services/coachesService";
import { getLessons } from "../services/lessonsService";
import { getEvaluations } from "../services/evaluationsService";
import { ensureFixedTrainingsSeeded } from "../services/fixedTrainingsService";
import LessonsCalendar from "../components/LessonsCalendar";
import Modal from "../components/Modal";
import LessonDetailCard from "../components/LessonDetailCard";
import { getCurrentMonthYear, getTodayDate } from "../utils/dateUtils";
import {
  getUpcomingCalendarEntries,
  statusLabelForEntry,
  type CalendarEntry,
} from "../utils/fixedScheduleCalendar";
import { formatCalendarDayLabel } from "../utils/calendarUtils";

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

function AdminDashboard({ onChangeSection }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [fixedTrainings, setFixedTrainings] = useState<FixedTraining[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [dayEntries, setDayEntries] = useState<CalendarEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
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

  function handleSelectCalendarDay(entries: CalendarEntry[], date: string) {
    const registered = entries.filter((entry) => entry.lesson);
    if (registered.length === 1 && registered[0].lesson) {
      setSelectedLesson(registered[0].lesson);
      return;
    }

    setDayEntries(entries);
    setSelectedDate(date);
  }

  const pendingPayments = students.filter((student) => !student.paid).length;
  const finishedLessons = lessons.filter(
    (lesson) => lesson.status === "finished"
  ).length;
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

  const upcoming = useMemo(
    () => getUpcomingCalendarEntries(lessons, fixedTrainings, 6),
    [lessons, fixedTrainings]
  );

  const today = getTodayDate();
  const todayRegistered = lessons.filter(
    (lesson) => lesson.date === today && lesson.status !== "draft"
  ).length;

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Gestão da escola</p>
        <h1 className="page-title">Painel admin</h1>
        <p className="page-description">
          Visão geral e atalhos. O dia a dia de presenças continua em{" "}
          <strong>Hoje</strong>.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar dashboard...</p>
      ) : (
        <>
          <div className="admin-module-grid">
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("setup")}
            >
              <strong>Setup escola</strong>
              <span>Importar alunos e criar treinadores</span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("students")}
            >
              <strong>Alunos</strong>
              <span>{students.length} registos</span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("coaches")}
            >
              <strong>Treinadores</strong>
              <span>{coaches.length} registos</span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("fixed-trainings")}
            >
              <strong>Grupos fixos</strong>
              <span>{fixedTrainings.length} grupos na escala</span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("lessons")}
            >
              <strong>Calendário</strong>
              <span>
                {todayRegistered} registado
                {todayRegistered === 1 ? "" : "s"} hoje
              </span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("coach-activity")}
            >
              <strong>Treinos / mês</strong>
              <span>Totais por treinador</span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("payments")}
            >
              <strong>Pagamentos</strong>
              <span>{pendingPayments} pendentes</span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("evaluations")}
            >
              <strong>Avaliações</strong>
              <span>{evaluationsThisMonth} este mês</span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("compensations")}
            >
              <strong>Compensações</strong>
              <span>Faltas a repor</span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("inventory")}
            >
              <strong>Inventário</strong>
              <span>Material da escola</span>
            </button>
            <button
              type="button"
              className="admin-module-card"
              onClick={() => onChangeSection("vans")}
            >
              <strong>Carrinhas</strong>
              <span>Frota e tarefas</span>
            </button>
          </div>

          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Alunos</span>
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
              <h2>Próximos grupos</h2>
              <div className="lesson-preview-list">
                {upcoming.map((entry) => (
                  <div
                    className="lesson-preview lesson-preview-button"
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (entry.lesson) setSelectedLesson(entry.lesson);
                      else {
                        setDayEntries([entry]);
                        setSelectedDate(entry.date);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        if (entry.lesson) setSelectedLesson(entry.lesson);
                      }
                    }}
                  >
                    <strong>{entry.date}</strong>
                    <span>{statusLabelForEntry(entry)}</span>
                    <span>{entry.title}</span>
                    <span>{entry.coachName}</span>
                  </div>
                ))}
              </div>
              {upcoming.length === 0 && (
                <p className="muted">Sem grupos próximos.</p>
              )}
            </div>
          </div>

          <div className="calendar-wrapper">
            <LessonsCalendar
              lessons={lessons}
              fixedTrainings={fixedTrainings}
              onSelectDay={handleSelectCalendarDay}
              title="Calendário da escola"
            />
          </div>

          {dayEntries.length > 0 && (
            <Modal
              title={formatCalendarDayLabel(selectedDate)}
              onClose={() => {
                setDayEntries([]);
                setSelectedDate("");
              }}
            >
              <div className="calendar-day-lessons-list">
                {dayEntries.map((entry) => (
                  <button
                    type="button"
                    className="calendar-day-lesson-row"
                    key={entry.id}
                    onClick={() => {
                      if (!entry.lesson) return;
                      setDayEntries([]);
                      setSelectedDate("");
                      setSelectedLesson(entry.lesson);
                    }}
                    disabled={!entry.lesson}
                  >
                    <strong>{statusLabelForEntry(entry)}</strong>
                    <span>{entry.title}</span>
                    <small>
                      {entry.coachName}
                      {entry.studentCount
                        ? ` · ${entry.studentCount} alunos`
                        : ""}
                    </small>
                  </button>
                ))}
              </div>
            </Modal>
          )}

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
