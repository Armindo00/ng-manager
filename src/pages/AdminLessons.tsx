import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Lesson, Student } from "../types";
import type { FixedTraining } from "../data/fixedTrainings";
import { getStudents } from "../services/studentsService";
import { getLessons, deleteLesson } from "../services/lessonsService";
import { ensureFixedTrainingsSeeded } from "../services/fixedTrainingsService";
import LessonDetailCard from "../components/LessonDetailCard";
import LessonsCalendar from "../components/LessonsCalendar";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import { formatCalendarDayLabel } from "../utils/calendarUtils";
import {
  buildMonthCalendarEntries,
  statusLabelForEntry,
  type CalendarEntry,
} from "../utils/fixedScheduleCalendar";
import { getTodayDate } from "../utils/dateUtils";

function AdminLessons() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [fixedTrainings, setFixedTrainings] = useState<FixedTraining[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [studentsData, lessonsData, trainingsData] = await Promise.all([
        getStudents(),
        getLessons(),
        ensureFixedTrainingsSeeded(),
      ]);
      setStudents(studentsData);
      setLessons(lessonsData);
      setFixedTrainings(trainingsData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar calendário.");
    } finally {
      setLoading(false);
    }
  }

  const selectedDayEntries = useMemo(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    return buildMonthCalendarEntries({
      year,
      month,
      lessons,
      fixedTrainings,
      includePlanned: true,
    }).filter((entry) => entry.date === selectedDate);
  }, [selectedDate, lessons, fixedTrainings]);

  const monthStats = useMemo(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    const entries = buildMonthCalendarEntries({
      year,
      month,
      lessons,
      fixedTrainings,
      includePlanned: true,
    });
    return {
      planned: entries.filter((entry) => entry.status === "planned").length,
      registered: entries.filter(
        (entry) =>
          entry.status === "published" || entry.status === "finished"
      ).length,
      finished: entries.filter((entry) => entry.status === "finished").length,
    };
  }, [selectedDate, lessons, fixedTrainings]);

  function handleSelectDay(entries: CalendarEntry[], date: string) {
    setSelectedDate(date);
    const withLesson = entries.filter((entry) => entry.lesson);
    if (withLesson.length === 1 && withLesson[0].lesson) {
      setSelectedLesson(withLesson[0].lesson);
    }
  }

  async function confirmDeleteLesson() {
    if (!lessonToDelete) return;

    try {
      await deleteLesson(lessonToDelete.id);
      if (selectedLesson?.id === lessonToDelete.id) {
        setSelectedLesson(null);
      }
      await loadData();
      setLessonToDelete(null);
      toast.success("Treino eliminado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar treino.");
    }
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <p className="page-eyebrow">Operação</p>
        <h1 className="page-title">Calendário</h1>
        <p className="page-description">
          Escala semanal e sessões registadas pelos treinadores. As presenças
          marcam-se em Hoje.
        </p>
      </header>

      {loading ? (
        <p className="muted">A carregar calendário...</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Na escala (por registar)</span>
              <strong className="stat-number">{monthStats.planned}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Registados</span>
              <strong className="stat-number">{monthStats.registered}</strong>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Concluídos</span>
              <strong className="stat-number">{monthStats.finished}</strong>
            </div>
          </div>

          <div className="calendar-wrapper">
            <LessonsCalendar
              lessons={lessons}
              fixedTrainings={fixedTrainings}
              selectedDate={selectedDate}
              onSelectDay={handleSelectDay}
              title="Escala e treinos registados"
            />
          </div>

          <div className="card section-card">
            <h2>{formatCalendarDayLabel(selectedDate)}</h2>

            {selectedDayEntries.length === 0 ? (
              <p className="muted">Sem grupos neste dia.</p>
            ) : (
              <div className="coach-session-list">
                {selectedDayEntries.map((entry) => (
                  <div
                    className="coach-session-card coach-session-card-static"
                    key={entry.id}
                  >
                    <div className="coach-session-card-main">
                      <strong>{entry.title}</strong>
                      <span>
                        {entry.coachName}
                        {entry.secondaryCoachName
                          ? ` + ${entry.secondaryCoachName}`
                          : ""}
                      </span>
                      <span>
                        {entry.studentCount} aluno
                        {entry.studentCount === 1 ? "" : "s"}
                        {entry.time ? ` · ${entry.time}` : ""}
                      </span>
                    </div>

                    <div className="calendar-entry-actions">
                      <span
                        className={`coach-session-card-status${
                          entry.status === "finished"
                            ? " status-finished"
                            : entry.status === "published"
                              ? " ready"
                              : ""
                        }`}
                      >
                        {statusLabelForEntry(entry)}
                      </span>

                      {entry.lesson && (
                        <>
                          <button
                            type="button"
                            className="compact-btn"
                            onClick={() => setSelectedLesson(entry.lesson!)}
                          >
                            Abrir
                          </button>
                          <button
                            type="button"
                            className="danger-btn compact-btn"
                            onClick={() => setLessonToDelete(entry.lesson!)}
                          >
                            Apagar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {selectedLesson && (
        <Modal title="Ficha do treino" onClose={() => setSelectedLesson(null)}>
          <LessonDetailCard lesson={selectedLesson} students={students} />
        </Modal>
      )}

      {lessonToDelete && (
        <ConfirmDialog
          title="Eliminar treino"
          message="Apagar este treino registado? Esta ação não pode ser anulada."
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDeleteLesson}
          onCancel={() => setLessonToDelete(null)}
        />
      )}
    </div>
  );
}

export default AdminLessons;
